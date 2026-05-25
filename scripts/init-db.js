require("dotenv").config();
const { initializeDatabase } = require("../src/db/init");
const { closePool } = require("../src/db/pool");

initializeDatabase()
  .then(() => {
    console.log("Database ready:", process.env.DB_NAME || process.env.MYSQL_DATABASE || "ocm_report_system");
  })
  .catch((err) => {
    console.error("Database setup failed:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
