const mysql = require("mysql2/promise");
const { config } = require("../config/env");

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      connectionLimit: config.db.connectionLimit,
      charset: "utf8mb4",
      dateStrings: true,
    });
  }
  return pool;
}

async function getConnection() {
  return getPool().getConnection();
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = { getPool, getConnection, closePool };
