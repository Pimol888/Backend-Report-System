const { getPool } = require("../db/pool");

function mapNoteRow(row) {
  return {
    id: row.id,
    reportId: row.report_id,
    text: row.text,
    author: row.author,
    timeLabel: row.time_label,
    kind: row.kind || undefined,
    createdAt: row.created_at,
  };
}

async function listByReportId(reportId) {
  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT * FROM admin_notes WHERE report_id = ? ORDER BY created_at ASC",
    [reportId],
  );
  return rows.map(mapNoteRow);
}

async function findLatestByReportId(reportId) {
  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT * FROM admin_notes WHERE report_id = ? ORDER BY created_at DESC LIMIT 1",
    [reportId],
  );
  return mapNoteRow(rows[0]);
}

async function insertNote(note, conn = null) {
  const db = conn || getPool();
  await db.query(
    `INSERT INTO admin_notes (id, report_id, text, author, time_label, kind, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [note.id, note.reportId, note.text, note.author, note.timeLabel, note.kind, note.createdAt],
  );
  return note;
}

module.exports = {
  findLatestByReportId,
  insertNote,
  listByReportId,
};
