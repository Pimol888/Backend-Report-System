const { getPool } = require("../db/pool");

function mapUserRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    password: row.password,
    role: row.role,
    name: row.name,
    courtesyName: row.courtesy_name,
    phone: row.phone,
    departmentId: row.department_id,
    generalDirectorateId: row.general_directorate_id,
    initials: row.initials,
  };
}

async function findByEmail(email) {
  const pool = getPool();
  const [rows] = await pool.query("SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1", [email]);
  return mapUserRow(rows[0]);
}

async function findById(id) {
  const pool = getPool();
  const [rows] = await pool.query("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
  return mapUserRow(rows[0]);
}

async function createUser(user, conn = null) {
  const db = conn || getPool();
  await db.query(
    `INSERT INTO users (id, email, password, role, name, courtesy_name, phone, department_id, general_directorate_id, initials)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user.id,
      user.email,
      user.password,
      user.role,
      user.name,
      user.courtesyName || "លោក",
      user.phone || "",
      user.departmentId || null,
      user.generalDirectorateId || null,
      user.initials || null,
    ],
  );
  return user;
}

async function updatePassword(userId, hashedPassword, conn = null) {
  const db = conn || getPool();
  await db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);
}

async function listTeamMembers(scope = {}) {
  const pool = getPool();
  let sql = `SELECT id, name, role AS member_role, initials FROM users WHERE role = 'user'`;
  const params = [];
  if (scope.departmentId) {
    sql += " AND department_id = ?";
    params.push(scope.departmentId);
  } else if (scope.generalDirectorateId) {
    sql += ` AND department_id IN (
      SELECT id FROM departments WHERE general_directorate_id = ?
    )`;
    params.push(scope.generalDirectorateId);
  }
  sql += " ORDER BY name";
  const [rows] = await pool.query(sql, params);
  return rows.map((r) => ({
    id: r.id.replace(/^u-member-/, "") || r.id,
    name: r.name,
    role: r.member_role || "អ្នកប្រើប្រាស់",
    initials: r.initials || r.name.slice(0, 2),
  }));
}

module.exports = {
  createUser,
  findByEmail,
  findById,
  listTeamMembers,
  mapUserRow,
  updatePassword,
};
