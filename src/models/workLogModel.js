const { nanoid } = require("nanoid");

const ROLES = ["admin", "super_admin"];
const ROLE_SET = new Set(ROLES);

function assertValidRole(role) {
  if (!ROLE_SET.has(role)) throw new Error("Invalid role for work log");
}

/**
 * Build a work log entry for storage.
 * @param {Object} data - { title, description, workDate, attachmentFilename?, ticketId? }
 * @param {string} userId - admin id (from req.admin.sub)
 * @param {string} role - 'admin' | 'super_admin'
 */
function createWorkLog(data, userId, role) {
  assertValidRole(role);
  const now = new Date().toISOString();
  const workDate = String(data.workDate ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) {
    throw new Error("workDate must be YYYY-MM-DD");
  }
  const out = {
    id: nanoid(),
    userId,
    role: role === "super_admin" ? "super_admin" : "admin",
    title: String(data.title ?? "").trim(),
    description: String(data.description ?? "").trim(),
    workDate,
    createdAt: now,
    updatedAt: now,
  };
  if (data.attachmentFilename) out.attachmentFilename = String(data.attachmentFilename);
  if (data.ticketId != null) out.ticketId = Number(data.ticketId) || data.ticketId;
  return out;
}

/**
 * Apply updates to a work log (for PUT). title, description, workDate, attachmentFilename (set or clear).
 */
function applyWorkLogUpdate(existing, data) {
  const updated = { ...existing };
  if (data.title !== undefined) updated.title = String(data.title).trim();
  if (data.description !== undefined) updated.description = String(data.description).trim();
  if (data.workDate !== undefined) {
    const workDate = String(data.workDate).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) throw new Error("workDate must be YYYY-MM-DD");
    updated.workDate = workDate;
  }
  if (data.attachmentFilename !== undefined) {
    updated.attachmentFilename = data.attachmentFilename ? String(data.attachmentFilename) : undefined;
    if (!updated.attachmentFilename) delete updated.attachmentFilename;
  }
  updated.updatedAt = new Date().toISOString();
  return updated;
}

module.exports = {
  ROLES,
  assertValidRole,
  createWorkLog,
  applyWorkLogUpdate,
};
