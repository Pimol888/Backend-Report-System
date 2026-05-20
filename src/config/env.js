function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const config = Object.freeze({
  host: (process.env.HOST || "127.0.0.1").trim(),
  port: num(process.env.PORT, 3000),

  // MySQL Database (supports both DB_* and MYSQL_* envs)
  db: {
    host: (process.env.DB_HOST || process.env.MYSQL_HOST || "127.0.0.1").trim(),
    port: num(process.env.DB_PORT || process.env.MYSQL_PORT, 3306),
    user: (process.env.DB_USER || process.env.MYSQL_USER || "root").trim(),
    password: (process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || "").trim(),
    database: (process.env.DB_NAME || process.env.MYSQL_DATABASE || "ocm_report_system").trim(),
    connectionLimit: num(process.env.DB_CONNECTION_LIMIT || process.env.MYSQL_CONNECTION_LIMIT, 10),
  },

  // Auth (set JWT_EXPIRES_IN to e.g. "8h" or "7d" to enable expiry; leave unset for no expiry)
  jwtSecret: process.env.JWT_SECRET || "dev_secret_change_me",
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN || "8h").trim(),
});

module.exports = { config };

