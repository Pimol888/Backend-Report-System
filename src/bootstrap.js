const fs = require("node:fs/promises");
const path = require("node:path");
const { initializeDatabase } = require("./report/store");

async function ensureRuntimeDirs() {
  await fs.mkdir(path.join(process.cwd(), "uploads"), { recursive: true });
  await fs.mkdir(path.join(process.cwd(), "uploads", "reports"), { recursive: true });
  await fs.mkdir(path.join(process.cwd(), "uploads", "reports", "temp"), { recursive: true });
  await fs.mkdir(path.join(process.cwd(), "data"), { recursive: true });
}

async function bootstrap() {
  await ensureRuntimeDirs();
  await initializeDatabase();
}

module.exports = { bootstrap };

