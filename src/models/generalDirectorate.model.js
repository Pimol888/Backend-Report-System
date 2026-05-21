const { getPool } = require("../db/pool");

async function listGeneralDirectorates(departmentId = null) {
  const pool = getPool();
  let sql = "SELECT id, name FROM general_directorates";
  const params = [];
  if (departmentId) {
    sql += ` WHERE id IN (
      SELECT general_directorate_id FROM departments WHERE id = ?
    )`;
    params.push(departmentId);
  }
  sql += " ORDER BY name";
  const [gds] = await pool.query(sql, params);

  const result = [];
  for (const gd of gds) {
    const [depts] = await pool.query(
      "SELECT id, name FROM departments WHERE general_directorate_id = ? ORDER BY name",
      [gd.id],
    );
    const departments = [];
    for (const dept of depts) {
      const [submitters] = await pool.query(
        "SELECT name FROM users WHERE department_id = ? AND role = 'user' ORDER BY name",
        [dept.id],
      );
      departments.push({
        id: dept.id,
        name: dept.name,
        submitterNames: submitters.map((s) => s.name),
      });
    }
    result.push({ id: gd.id, name: gd.name, departments });
  }
  return result;
}

module.exports = { listGeneralDirectorates };
