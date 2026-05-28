require("dotenv").config();
const { getPool, closePool } = require("../src/db/pool");

const TABLES = [
  "general_directorates",
  "departments",
  "users",
  "reports",
  "report_files",
  "admin_notes",
  "report_activity_logs",
];

(async () => {
  try {
    const pool = getPool();
    const [tables] = await pool.query("SHOW TABLES");
    const tableKey = Object.keys(tables[0] || {})[0];
    console.log("Tables in DB:");
    for (const row of tables) console.log(" -", row[tableKey]);

    console.log("\nRow counts:");
    for (const t of TABLES) {
      const [r] = await pool.query(`SELECT COUNT(*) AS c FROM \`${t}\``);
      console.log(` - ${t.padEnd(22)} ${r[0].c}`);
    }

    const [admins] = await pool.query(
      `SELECT id, email, role, name, department_id, general_directorate_id
       FROM users WHERE role IN ('admin','orgadmin','superadmin')`,
    );
    console.log("\nStaff accounts (admin / orgadmin / superadmin):");
    for (const u of admins) console.log(" -", u);
  } catch (err) {
    console.error("Check failed:", err.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
})();
