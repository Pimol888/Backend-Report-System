const { getPool } = require("../db/pool");

async function listDepartments(scope = {}) {
  const pool = getPool();
  let sql = `
    SELECT d.id, d.name, d.general_directorate_id AS generalDirectorateId, g.name AS generalDirectorateName
    FROM departments d
    JOIN general_directorates g ON g.id = d.general_directorate_id
  `;
  const params = [];
  if (scope.departmentId) {
    sql += " WHERE d.id = ?";
    params.push(scope.departmentId);
  } else if (scope.generalDirectorateId) {
    sql += " WHERE d.general_directorate_id = ?";
    params.push(scope.generalDirectorateId);
  }
  sql += " ORDER BY d.name";
  const [rows] = await pool.query(sql, params);

  const result = [];
  for (const row of rows) {
    const [submitters] = await pool.query(
      "SELECT name FROM users WHERE department_id = ? AND role = 'user' ORDER BY name",
      [row.id],
    );
    result.push({
      id: row.id,
      name: row.name,
      generalDirectorateId: row.generalDirectorateId,
      generalDirectorateName: row.generalDirectorateName,
      submitterNames: submitters.map((s) => s.name),
    });
  }
  return result;
}

async function findById(id) {
  const list = await listDepartments();
  return list.find((d) => d.id === id) || null;
}

module.exports = { findById, listDepartments };
