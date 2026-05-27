const { getPool } = require("../db/pool");

function mapReportRow(row) {
  return {
    id: row.id,
    title: row.title,
    cycle: row.cycle,
    status: row.status,
    description: row.description,
    periodLabel: row.period_label,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
    submitterId: row.submitter_id,
    submitterName: row.submitter_name,
    departmentId: row.department_id,
    generalDirectorateId: row.general_directorate_id,
    departmentName: row.department_name,
    generalDirectorateName: row.general_directorate_name,
    reviewedAt: row.reviewed_at,
    reviewerName: row.reviewer_name,
    submitterCourtesyName: row.courtesy_name,
    submitterEmail: row.submitter_email,
    submitterPhone: row.submitter_phone,
  };
}

const REPORT_SELECT = `
  SELECT r.*, u.name AS submitter_name, u.courtesy_name, u.email AS submitter_email, u.phone AS submitter_phone,
         d.name AS department_name, g.name AS general_directorate_name
  FROM reports r
  JOIN users u ON u.id = r.submitter_id
  JOIN departments d ON d.id = r.department_id
  JOIN general_directorates g ON g.id = r.general_directorate_id
`;

async function findById(id) {
  const pool = getPool();
  const [rows] = await pool.query(`${REPORT_SELECT} WHERE r.id = ? LIMIT 1`, [id]);
  return mapReportRow(rows[0]);
}

async function listReports(filters = {}) {
  const pool = getPool();
  const where = [];
  const params = [];

  if (filters.departmentId) {
    where.push("r.department_id = ?");
    params.push(filters.departmentId);
  }
  if (filters.generalDirectorateId) {
    where.push("r.general_directorate_id = ?");
    params.push(filters.generalDirectorateId);
  }
  if (filters.cycle) {
    where.push("r.cycle = ?");
    params.push(filters.cycle);
  }
  if (filters.status) {
    where.push("r.status = ?");
    params.push(filters.status);
  }
  if (filters.submitterName) {
    where.push("u.name = ?");
    params.push(filters.submitterName);
  }
  if (filters.search) {
    const q = `%${filters.search}%`;
    where.push("(r.title LIKE ? OR u.name LIKE ? OR d.name LIKE ? OR g.name LIKE ?)");
    params.push(q, q, q, q);
  }

  let sql = `${REPORT_SELECT}`;
  if (where.length) sql += ` WHERE ${where.join(" AND ")}`;

  const sort = filters.sort === "oldest" ? "ASC" : filters.sort === "title" ? "r.title ASC" : "DESC";
  sql += ` ORDER BY ${filters.sort === "title" ? "r.title ASC" : "r.submitted_at " + (sort === "ASC" ? "ASC" : "DESC")}`;

  const [rows] = await pool.query(sql, params);
  return rows.map(mapReportRow);
}

async function insertReport(report, conn = null) {
  const db = conn || getPool();
  await db.query(
    `INSERT INTO reports
     (id, title, cycle, status, description, period_label, submitted_at, updated_at, submitter_id, department_id, general_directorate_id, reviewed_at, reviewer_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      report.id,
      report.title,
      report.cycle,
      report.status,
      report.description,
      report.periodLabel,
      report.submittedAt,
      report.updatedAt,
      report.submitterId,
      report.departmentId,
      report.generalDirectorateId,
      report.reviewedAt,
      report.reviewerName,
    ],
  );
}

async function updateStatus(id, { status, reviewedAt, reviewerName, updatedAt }, conn = null) {
  const db = conn || getPool();
  const stamp = updatedAt || reviewedAt || new Date();
  await db.query(
    "UPDATE reports SET status = ?, reviewed_at = ?, reviewer_name = ?, updated_at = ? WHERE id = ?",
    [status, reviewedAt, reviewerName, stamp, id],
  );
}

async function countByCycle(filters = {}) {
  const rows = await listReports(filters);
  return rows.reduce(
    (acc, row) => {
      acc[row.cycle] += 1;
      return acc;
    },
    { monthly: 0, quarterly: 0, semiannual: 0, yearly: 0 },
  );
}

module.exports = {
  countByCycle,
  findById,
  insertReport,
  listReports,
  updateStatus,
};
