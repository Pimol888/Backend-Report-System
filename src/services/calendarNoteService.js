const fs = require("fs/promises");
const path = require("path");
const { nanoid } = require("nanoid");
const db = require("../db");
const { getDb, updateDb } = db;
const { HttpError } = require("../utils/httpError");

const CALENDAR_UPLOADS = path.join(process.cwd(), "uploads", "calendar-notes");

async function ensureUploadDir() {
  await fs.mkdir(CALENDAR_UPLOADS, { recursive: true });
}

/** Save base64 data URL (image or PDF) to disk, return /uploads/calendar-notes/filename */
async function saveBase64Attachment(dataUrl) {
  if (typeof dataUrl !== "string" || !dataUrl.trim()) return null;

  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) return null;
  const mime = String(match[1] || "").toLowerCase();
  const base64Data = String(match[2] || "").replace(/\s/g, "");
  if (!base64Data) return null;

  await ensureUploadDir();

  // PDF
  if (mime === "application/pdf" || mime === "application/x-pdf") {
    const filename = `note-${nanoid(10)}.pdf`;
    const filePath = path.join(CALENDAR_UPLOADS, filename);
    const buffer = Buffer.from(base64Data, "base64");
    await fs.writeFile(filePath, buffer);
    return `/uploads/calendar-notes/${filename}`;
  }

  // Image: data:image/...
  if (!mime.startsWith("image/")) return null;
  const extMap = {
    jpeg: "jpg",
    jpg: "jpg",
    png: "png",
    gif: "gif",
    webp: "webp",
    "svg+xml": "svg",
  };
  const subtype = mime.slice("image/".length);
  const fileExt = extMap[subtype] || subtype.replace(/[^a-z0-9]+/g, "") || "png";
  const filename = `note-${nanoid(10)}.${fileExt}`;
  const filePath = path.join(CALENDAR_UPLOADS, filename);
  const buffer = Buffer.from(base64Data, "base64");
  await fs.writeFile(filePath, buffer);
  return `/uploads/calendar-notes/${filename}`;
}

/** Convert image entry to absolute URL if it's a relative path */
function resolveImageUrl(url, apiBase) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  const base = (apiBase || "").replace(/\/$/, "");
  return base + (trimmed.startsWith("/") ? trimmed : `/${trimmed}`);
}

function hasMysqlPool() {
  return typeof db.getPool === "function";
}

function parseImagesValue(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string" && v.trim());
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((v) => typeof v === "string" && v.trim());
      if (typeof parsed === "string" && parsed.trim()) return [parsed.trim()];
    } catch {
      if (value.trim()) return [value.trim()];
    }
    return [];
  }
  return [];
}

function normalizeDateKey(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    return null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return null;
}

async function listCalendarNotesFromMysql(adminId, req) {
  const pool = db.getPool();
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      "SELECT date, note, images FROM calendarNotes WHERE adminId = ?",
      [String(adminId)]
    );
    const baseUrl = req ? `${req.protocol}://${req.get("host")}` : "";
    const out = {};
    for (const row of rows || []) {
      const dateKey = normalizeDateKey(row.date);
      if (!dateKey) continue;
      const images = parseImagesValue(row.images)
        .map((u) => (baseUrl ? resolveImageUrl(u, baseUrl) : u))
        .filter(Boolean);
      out[dateKey] = {
        note: String(row.note ?? ""),
        images,
      };
    }
    return out;
  } finally {
    conn.release();
  }
}

async function getCalendarNoteByDateFromMysql(adminId, date) {
  const pool = db.getPool();
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      "SELECT note, images FROM calendarNotes WHERE adminId = ? AND date = ?",
      [String(adminId), String(date)]
    );
    const row = rows && rows[0] ? rows[0] : null;
    if (!row) return null;
    return {
      note: String(row.note ?? ""),
      images: parseImagesValue(row.images),
    };
  } finally {
    conn.release();
  }
}

async function upsertCalendarNoteToMysql(adminId, date, note, images) {
  const pool = db.getPool();
  const conn = await pool.getConnection();
  try {
    await conn.query(
      `INSERT INTO calendarNotes (adminId, date, note, images, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE note=VALUES(note), images=VALUES(images), updatedAt=NOW()`,
      [String(adminId), String(date), String(note || ""), JSON.stringify(images || [])]
    );
  } finally {
    conn.release();
  }
}

async function deleteCalendarNoteFromMysql(adminId, date) {
  const pool = db.getPool();
  const conn = await pool.getConnection();
  try {
    const [result] = await conn.query(
      "DELETE FROM calendarNotes WHERE adminId = ? AND date = ?",
      [String(adminId), String(date)]
    );
    return result && result.affectedRows > 0;
  } finally {
    conn.release();
  }
}

/** Normalize attachments array: save base64 (image or PDF) to disk, keep URLs as-is */
async function processImages(images) {
  if (!Array.isArray(images)) return [];
  const result = [];
  for (const item of images) {
    if (typeof item !== "string" || !item.trim()) continue;
    const isDataUrl = item.startsWith("data:image/") || item.startsWith("data:application/pdf;base64,");
    if (isDataUrl) {
      const saved = await saveBase64Attachment(item);
      if (saved) result.push(saved);
    } else {
      result.push(item.trim());
    }
  }
  return result;
}

function getAdminId(req) {
  const admin = req?.admin;
  return admin?.sub ?? admin?.id ?? null;
}

async function listCalendarNotes(req) {
  const adminId = getAdminId(req);
  if (!adminId) return {};
  if (hasMysqlPool()) {
    return await listCalendarNotesFromMysql(adminId, req);
  }
  const db = await getDb();
  const allNotes = db.calendarNotes || {};
  const userNotes = allNotes[adminId] || {};
  const baseUrl = req ? `${req.protocol}://${req.get("host")}` : "";
  const out = {};
  for (const [date, entry] of Object.entries(userNotes)) {
    if (!entry || typeof entry !== "object") continue;
    const images = Array.isArray(entry.images) ? entry.images : [];
    out[date] = {
      note: String(entry.note ?? ""),
      images: images.map((u) => (baseUrl ? resolveImageUrl(u, baseUrl) : u)).filter(Boolean),
    };
  }
  return out;
}

async function getCalendarNoteByDate(date, req) {
  const adminId = getAdminId(req);
  if (!adminId) return null;
  if (hasMysqlPool()) {
    return await getCalendarNoteByDateFromMysql(adminId, date);
  }
  const db = await getDb();
  const allNotes = db.calendarNotes || {};
  const userNotes = allNotes[adminId] || {};
  const entry = userNotes[date];
  if (!entry) return null;
  return {
    note: String(entry.note ?? ""),
    images: Array.isArray(entry.images) ? entry.images : [],
  };
}

async function upsertCalendarNote(date, payload, req) {
  const adminId = getAdminId(req);
  if (!adminId) throw new HttpError(401, "Admin authentication required");
  const note = String(payload.note ?? "").trim();
  const images = await processImages(payload.images || []);

  if (hasMysqlPool()) {
    await upsertCalendarNoteToMysql(adminId, date, note, images);
    return { note, images };
  }

  await updateDb(async (db) => {
    if (typeof db.calendarNotes !== "object" || db.calendarNotes === null) {
      db.calendarNotes = {};
    }
    if (typeof db.calendarNotes[adminId] !== "object" || db.calendarNotes[adminId] === null) {
      db.calendarNotes[adminId] = {};
    }
    db.calendarNotes[adminId][date] = { note, images };
  });

  return { note, images };
}

async function deleteCalendarNote(date, req) {
  const adminId = getAdminId(req);
  if (!adminId) return false;
  if (hasMysqlPool()) {
    return await deleteCalendarNoteFromMysql(adminId, date);
  }
  let found = false;
  await updateDb(async (db) => {
    if (typeof db.calendarNotes !== "object") db.calendarNotes = {};
    if (typeof db.calendarNotes[adminId] !== "object") db.calendarNotes[adminId] = {};
    if (date in db.calendarNotes[adminId]) {
      delete db.calendarNotes[adminId][date];
      found = true;
    }
  });
  return found;
}

module.exports = {
  listCalendarNotes,
  getCalendarNoteByDate,
  upsertCalendarNote,
  deleteCalendarNote,
  resolveImageUrl,
};
