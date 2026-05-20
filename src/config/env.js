function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function list(value) {
  if (!value) return [];
  return String(value)
    .split(/[,\s]+/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function uniqueList(items) {
  return Array.from(new Set(items.map((v) => String(v))));
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
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "",
  resetTokenExpiresIn: process.env.RESET_TOKEN_EXPIRES_IN || "1h", // for forgot password

  // Seed admin (created on first run if no admin exists)
  adminUsername: (process.env.ADMIN_USERNAME || "admin").trim(),
  adminPassword: (process.env.ADMIN_PASSWORD || "admin123").trim(),
  adminEmail: (process.env.ADMIN_EMAIL || "").trim() || null,

  // Uploads
  maxImageMb: Math.max(1, num(process.env.MAX_IMAGE_MB, 5)),

  // Email (Nodemailer SMTP – for password reset)
  smtpHost: (process.env.SMTP_HOST || "").trim(),
  smtpPort: num(process.env.SMTP_PORT, 587),
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: (process.env.SMTP_USER || "").trim(),
  smtpPass: (process.env.SMTP_PASS || "").trim(),
  mailFrom: (process.env.MAIL_FROM || process.env.SMTP_USER || "").trim(),
});

/** Parse JWT expiry string (e.g. "8h", "1d") to seconds for API response; returns null if no expiry */
function getJwtExpiresInSeconds() {
  const s = (process.env.JWT_EXPIRES_IN || "").trim();
  if (!s || s.toLowerCase() === "none") return null;
  const match = s.match(/^(\d+)([hdm])$/i);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  const unit = (match[2] || "h").toLowerCase();
  if (unit === "h") return n * 3600;
  if (unit === "d") return n * 86400;
  if (unit === "m") return n * 60;
  return null;
}

module.exports = { config, getJwtExpiresInSeconds };

