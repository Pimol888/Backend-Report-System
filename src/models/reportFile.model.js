const { getPool } = require("../db/pool");

function mapFileRow(row) {
  return {
    id: row.id,
    reportId: row.report_id,
    type: row.file_type,
    name: row.original_name,
    storedName: row.stored_name,
    sizeBytes: row.size_bytes,
    pages: row.pages,
    uploadedAt: row.uploaded_at,
    isResubmission: Boolean(row.is_resubmission),
  };
}

async function listByReportId(reportId) {
  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT * FROM report_files WHERE report_id = ? ORDER BY uploaded_at ASC",
    [reportId],
  );
  return rows.map(mapFileRow);
}

async function findById(fileId, reportId) {
  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT * FROM report_files WHERE id = ? AND report_id = ? LIMIT 1",
    [fileId, reportId],
  );
  return mapFileRow(rows[0]);
}

async function insertFile(file, conn = null) {
  const db = conn || getPool();
  await db.query(
    `INSERT INTO report_files (id, report_id, file_type, original_name, stored_name, size_bytes, pages, uploaded_at, is_resubmission)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      file.id,
      file.reportId,
      file.type,
      file.name,
      file.storedName,
      file.sizeBytes,
      file.pages || 0,
      file.uploadedAt,
      file.isResubmission ? 1 : 0,
    ],
  );
}

module.exports = {
  findById,
  insertFile,
  listByReportId,
  mapFileRow,
};
