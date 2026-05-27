const { getPool } = require("../db/pool");

function parseMetadata(value) {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch (_err) {
    return undefined;
  }
}

function mapActivityLogRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    reportId: row.report_id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    action: row.action,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    message: row.message,
    metadata: parseMetadata(row.metadata_json),
    createdAt: row.created_at,
  };
}

async function listByReportId(reportId) {
  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT * FROM report_activity_logs WHERE report_id = ? ORDER BY created_at ASC",
    [reportId],
  );
  return rows.map(mapActivityLogRow);
}

async function insertActivityLog(entry, conn = null) {
  const db = conn || getPool();
  await db.query(
    `INSERT INTO report_activity_logs
     (id, report_id, actor_id, actor_name, action, from_status, to_status, message, metadata_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.id,
      entry.reportId,
      entry.actorId || null,
      entry.actorName,
      entry.action,
      entry.fromStatus || null,
      entry.toStatus || null,
      entry.message || null,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
      entry.createdAt,
    ],
  );
  return entry;
}

module.exports = {
  insertActivityLog,
  listByReportId,
  mapActivityLogRow,
};
