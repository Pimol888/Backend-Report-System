const fs = require("node:fs/promises");
const path = require("node:path");
const { seedAdminIfNeeded } = require("./services/adminService");
const db = require("./db");

async function ensureRuntimeDirs() {
  await fs.mkdir(path.join(process.cwd(), "uploads"), { recursive: true });
  await fs.mkdir(path.join(process.cwd(), "uploads", "meeting-notes"), { recursive: true });
  await fs.mkdir(path.join(process.cwd(), "uploads", "work-logs"), { recursive: true });
  await fs.mkdir(path.join(process.cwd(), "uploads", "calendar-notes"), { recursive: true });
  await fs.mkdir(path.join(process.cwd(), "data"), { recursive: true });
}

async function bootstrap() {
  await ensureRuntimeDirs();
  if (typeof db.initializeDatabase === "function") {
    await db.initializeDatabase();
  }
  await seedAdminIfNeeded();
}

module.exports = { bootstrap };

