require("dotenv").config();
const mysql = require("mysql2/promise");
const { config } = require("../src/config/env");
const { initializeDatabase } = require("../src/db/init");
const { closePool } = require("../src/db/pool");

(async () => {
  try {
    const root = await mysql.createConnection({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
    });
    await root.query(`DROP DATABASE IF EXISTS \`${config.db.database}\``);
    await root.end();
    console.log(`Dropped database '${config.db.database}'.`);

    await initializeDatabase();
    console.log(`Recreated and seeded database '${config.db.database}'.`);
  } catch (err) {
    console.error("Reset failed:", err.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
})();
