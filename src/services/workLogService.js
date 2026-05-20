const { getDb, updateDb } = require("../db");
const { HttpError } = require("../utils/httpError");
const { createWorkLog, applyWorkLogUpdate } = require("../models/workLogModel");
const { listStaffForAssignment } = require("./adminService");
const { nowLocalDateTime } = require("../utils/datetime");

function pad2(n) {
  return String(n).padStart(2, "0");
}

/**
 * Normalize input into a YYYY-MM-DD string without UTC shifting.
 * - If it's already YYYY-MM-DD, keep it.
 * - If it's MySQL DATETIME string, take first 10 chars.
 * - If it's ISO string, take first 10 chars.
 * - If it's a Date, format using local date parts.
 */
function toLocalDateOnly(value) {
  if (!value) return "";
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(s)) return s.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
    const d = new Date(s);
    if (isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return "";
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
  }
  // e.g. numeric timestamp
  if (typeof value === "number") {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  return "";
}

function getAdminId(req) {
  const admin = req?.admin;
  return admin?.sub ?? admin?.id ?? null;
}

function getAdminRole(req) {
  return req?.admin?.role ?? "admin";
}

function isSuperAdmin(req) {
  return getAdminRole(req) === "super_admin";
}

/** Parse filter from query: filter=week|month, or startDate&endDate for custom */
function getDateRange(query) {
  const filter = (query.filter || "").toLowerCase();
  const startDate = query.startDate ? String(query.startDate).trim() : null;
  const endDate = query.endDate ? String(query.endDate).trim() : null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (filter === "week") {
    const start = new Date(today);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return {
      start: toLocalDateOnly(start),
      end: toLocalDateOnly(end),
    };
  }
  if (filter === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return {
      start: toLocalDateOnly(start),
      end: toLocalDateOnly(end),
    };
  }
  if (startDate && endDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate) && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return { start: startDate, end: endDate };
  }
  return null;
}

function filterLogsByDateRange(logs, range) {
  if (!range) return logs;
  return logs.filter((log) => {
    const workDate = toLocalDateOnly(log.workDate);
    return workDate >= range.start && workDate <= range.end;
  });
}

/** Safe string comparison for dates - handles Date objects and strings */
function safeCompare(a, b) {
  const aDate = a instanceof Date ? a : null;
  const bDate = b instanceof Date ? b : null;
  if (aDate && bDate) return bDate.getTime() - aDate.getTime();
  const strA = typeof a === "string" ? a : (a ? String(a) : "");
  const strB = typeof b === "string" ? b : (b ? String(b) : "");
  return strB.localeCompare(strA);
}

/** Enrich work logs with admin display name from db.admins */
function enrichWithAdminName(logs, db) {
  const admins = Array.isArray(db.admins) ? db.admins : [];
  const byId = new Map(admins.map((a) => [a.id, a]));
  return logs.map((log) => ({
    ...log,
    adminName: byId.get(log.userId)?.username ?? log.userId,
  }));
}

async function create(req) {
  const adminId = getAdminId(req);
  if (!adminId) throw new HttpError(401, "Authentication required");
  const role = getAdminRole(req);
  const payload = { ...req.validated };
  if (req.file?.filename) payload.attachmentFilename = req.file.filename;
  const log = createWorkLog(payload, adminId, role);
  await updateDb((db) => {
    if (!Array.isArray(db.workLogs)) db.workLogs = [];
    db.workLogs.push(log);
  });
  return log;
}

/**
 * Create a work log for a given admin (internal use, e.g. when they close a legacy ticket).
 * @param {string} adminId - Admin user id (sub)
 * @param {{ title: string, description: string, workDate: string, ticketId?: number|string }} payload - title, description, workDate (YYYY-MM-DD), optional ticketId
 * @returns {Promise<Object>} Created work log
 */
async function createForAdmin(adminId, payload) {
  if (!adminId || !payload || typeof payload !== "object") return null;
  const title = String(payload.title ?? "").trim();
  const workDate = String(payload.workDate ?? "").trim();
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(workDate)) return null;
  const db = await getDb();
  const admin = (db.admins || []).find((a) => String(a.id) === String(adminId));
  const role = admin?.role === "super_admin" ? "super_admin" : "admin";
  const data = { title, description: String(payload.description ?? "").trim(), workDate };
  if (payload.ticketId != null) data.ticketId = payload.ticketId;
  const log = createWorkLog(data, String(adminId), role);
  await updateDb((db) => {
    if (!Array.isArray(db.workLogs)) db.workLogs = [];
    db.workLogs.push(log);
  });
  return log;
}

async function listMy(req) {
  const adminId = getAdminId(req);
  if (!adminId) throw new HttpError(401, "Authentication required");
  const db = await getDb();
  let logs = (db.workLogs || []).filter((l) => l.userId === adminId);
  const range = getDateRange(req.query || {});
  logs = filterLogsByDateRange(logs, range);
  logs.sort((a, b) => safeCompare(a.workDate, b.workDate) || safeCompare(a.createdAt, b.createdAt));
  return enrichWithAdminName(logs, db);
}

async function listAll(req) {
  if (!isSuperAdmin(req)) throw new HttpError(403, "Super admin access required");
  const db = await getDb();
  let logs = [...(db.workLogs || [])];
  const range = getDateRange(req.query || {});
  logs = filterLogsByDateRange(logs, range);
  logs.sort((a, b) => safeCompare(a.workDate, b.workDate) || safeCompare(a.createdAt, b.createdAt));
  return enrichWithAdminName(logs, db);
}

async function listByAdminId(req) {
  if (!isSuperAdmin(req)) throw new HttpError(403, "Super admin access required");
  const adminId = req.params.adminId;
  if (!adminId) throw new HttpError(400, "adminId required");
  const db = await getDb();
  let logs = (db.workLogs || []).filter((l) => l.userId === adminId);
  const range = getDateRange(req.query || {});
  logs = filterLogsByDateRange(logs, range);
  logs.sort((a, b) => safeCompare(a.workDate, b.workDate) || safeCompare(a.createdAt, b.createdAt));
  return enrichWithAdminName(logs, db);
}

async function getById(id, req) {
  const db = await getDb();
  const log = (db.workLogs || []).find((l) => l.id === id);
  if (!log) return null;
  const adminId = getAdminId(req);
  if (log.userId !== adminId && !isSuperAdmin(req)) return null;
  return enrichWithAdminName([log], db)[0];
}

async function update(id, req) {
  const adminId = getAdminId(req);
  if (!adminId) throw new HttpError(401, "Authentication required");
  const validated = { ...req.validated };
  if (req.file?.filename) validated.attachmentFilename = req.file.filename;
  else if (req.validated.clearAttachment) validated.attachmentFilename = null;
  let updatedLog = null;
  await updateDb((db) => {
    const log = (db.workLogs || []).find((l) => l.id === id);
    if (!log) return;
    if (log.userId !== adminId) throw new HttpError(403, "You can only edit your own work logs");
    const applied = applyWorkLogUpdate(log, validated);
    Object.assign(log, applied);
    if (req.validated.clearAttachment) delete log.attachmentFilename;
    updatedLog = { ...log };
  });
  if (!updatedLog) throw new HttpError(404, "Work log not found");
  const db = await getDb();
  return enrichWithAdminName([updatedLog], db)[0];
}

async function remove(id, req) {
  const adminId = getAdminId(req);
  if (!adminId) throw new HttpError(401, "Authentication required");
  let found = false;
  await updateDb((db) => {
    const idx = (db.workLogs || []).findIndex((l) => l.id === id);
    if (idx === -1) return;
    const log = db.workLogs[idx];
    if (log.userId !== adminId) throw new HttpError(403, "You can only delete your own work logs");
    db.workLogs.splice(idx, 1);
    found = true;
  });
  return found;
}

// ——— Follow system ———
async function follow(adminId, req) {
  if (!isSuperAdmin(req)) throw new HttpError(403, "Super admin access required");
  const superAdminId = getAdminId(req);
  if (!superAdminId) throw new HttpError(401, "Authentication required");
  const db = await getDb();
  const adminExists = (db.admins || []).some((a) => a.id === adminId && a.role !== "super_admin");
  if (!adminExists) throw new HttpError(404, "Admin not found");
  const exists = (db.workFollowers || []).some(
    (f) => f.superAdminId === superAdminId && f.adminId === adminId
  );
  if (exists) return { followed: true, already: true };
  await updateDb((db) => {
    if (!Array.isArray(db.workFollowers)) db.workFollowers = [];
    db.workFollowers.push({
      id: require("nanoid").nanoid(),
      superAdminId,
      adminId,
          createdAt: nowLocalDateTime(),
    });
  });
  return { followed: true, already: false };
}

async function unfollow(adminId, req) {
  if (!isSuperAdmin(req)) throw new HttpError(403, "Super admin access required");
  const superAdminId = getAdminId(req);
  await updateDb((db) => {
    if (!Array.isArray(db.workFollowers)) return;
    db.workFollowers = db.workFollowers.filter(
      (f) => !(f.superAdminId === superAdminId && f.adminId === adminId)
    );
  });
  return { unfollowed: true };
}

async function getFollowedFeed(req) {
  if (!isSuperAdmin(req)) throw new HttpError(403, "Super admin access required");
  const superAdminId = getAdminId(req);
  const db = await getDb();
  const followedIds = new Set(
    (db.workFollowers || [])
      .filter((f) => f.superAdminId === superAdminId)
      .map((f) => f.adminId)
  );
  let logs = (db.workLogs || []).filter((l) => followedIds.has(l.userId));
  const range = getDateRange(req.query || {});
  logs = filterLogsByDateRange(logs, range);
  logs.sort((a, b) => safeCompare(a.workDate, b.workDate) || safeCompare(a.createdAt, b.createdAt));
  return enrichWithAdminName(logs, db);
}

async function listFollowedAdmins(req) {
  if (!isSuperAdmin(req)) throw new HttpError(403, "Super admin access required");
  const superAdminId = getAdminId(req);
  const db = await getDb();
  const adminIds = [...new Set(
    (db.workFollowers || [])
      .filter((f) => f.superAdminId === superAdminId)
      .map((f) => f.adminId)
  )];
  const admins = (db.admins || []).filter((a) => adminIds.includes(a.id));
  return admins.map((a) => ({ id: a.id, username: a.username }));
}

// ——— Export (report data for download) ———
async function getExportData(req, queryOverride = null) {
  const adminId = getAdminId(req);
  const role = getAdminRole(req);
  const query = queryOverride || req.query || {};
  const targetAdminId = query.adminId ? String(query.adminId).trim() : null;

  const db = await getDb();
  let logs;
  if (role === "super_admin" && targetAdminId) {
    logs = (db.workLogs || []).filter((l) => l.userId === targetAdminId);
  } else {
    logs = (db.workLogs || []).filter((l) => l.userId === adminId);
  }
  const range = getDateRange(query);
  logs = filterLogsByDateRange(logs, range);
  logs.sort((a, b) => {
    const strA = toLocalDateOnly(a.workDate);
    const strB = toLocalDateOnly(b.workDate);
    const createdA = typeof a.createdAt === "string" ? a.createdAt : (a.createdAt ? String(a.createdAt) : "");
    const createdB = typeof b.createdAt === "string" ? b.createdAt : (b.createdAt ? String(b.createdAt) : "");
    return strA.localeCompare(strB) || createdA.localeCompare(createdB);
  });
  logs = enrichWithAdminName(logs, db);
  return { logs, range };
}

/** Build CSV string for report (government style: Date, Title, Description) */
function buildReportCsv(logs) {
  const escapeCsv = (v) => `"${String(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
  const header = ["Date", "Title", "Description"].map(escapeCsv).join(",");
  const rows = logs.map((l) => [l.workDate, l.title, l.description].map(escapeCsv).join(","));
  // Excel on Windows is happiest with CRLF + UTF-8 BOM (BOM added by controller)
  return [header, ...rows].join("\r\n");
}

module.exports = {
  getAdminId,
  getAdminRole,
  isSuperAdmin,
  getDateRange,
  create,
  createForAdmin,
  listMy,
  listAll,
  listByAdminId,
  getById,
  update,
  remove,
  follow,
  unfollow,
  getFollowedFeed,
  listFollowedAdmins,
  getExportData,
  buildReportCsv,
  listAdminsForDropdown: listStaffForAssignment,
};
