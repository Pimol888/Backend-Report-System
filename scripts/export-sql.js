require("dotenv").config();
const fs = require("node:fs/promises");
const path = require("node:path");
const { config } = require("../src/config/env");
const { getPool, closePool } = require("../src/db/pool");

const TABLES_IN_ORDER = [
  "general_directorates",
  "departments",
  "users",
  "reports",
  "report_files",
  "admin_notes",
  "report_activity_logs",
];

function escapeValue(value) {
  if (value === null || value === undefined) return "NULL";
  if (value instanceof Date) {
    const iso = value.toISOString().slice(0, 19).replace("T", " ");
    return `'${iso}'`;
  }
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (Buffer.isBuffer(value)) return `0x${value.toString("hex")}`;
  const str = String(value).replace(/\\/g, "\\\\").replace(/'/g, "''").replace(/\r?\n/g, "\\n");
  return `'${str}'`;
}

async function dumpTable(pool, table) {
  const [rows] = await pool.query(`SELECT * FROM \`${table}\``);
  if (!rows.length) return `-- (no rows in ${table})\n`;
  const cols = Object.keys(rows[0]);
  const colList = cols.map((c) => `\`${c}\``).join(", ");
  const lines = [
    `-- Data for table \`${table}\` (${rows.length} rows)`,
    `LOCK TABLES \`${table}\` WRITE;`,
  ];
  const chunks = [];
  for (const row of rows) {
    const values = cols.map((c) => escapeValue(row[c])).join(", ");
    chunks.push(`(${values})`);
  }
  lines.push(`INSERT INTO \`${table}\` (${colList}) VALUES`);
  lines.push(chunks.join(",\n") + ";");
  lines.push(`UNLOCK TABLES;`);
  lines.push("");
  return lines.join("\n");
}

(async () => {
  const pool = getPool();
  try {
    const dbName = config.db.database;
    const schemaSql = await fs.readFile(path.join(__dirname, "..", "src", "db", "schema.sql"), "utf8");

    const parts = [];
    parts.push(`-- OCM Report System full SQL dump`);
    parts.push(`-- Generated: ${new Date().toISOString()}`);
    parts.push(`-- Run this in MySQL Workbench to recreate the database with data.`);
    parts.push("");
    parts.push(`SET NAMES utf8mb4;`);
    parts.push(`SET FOREIGN_KEY_CHECKS = 0;`);
    parts.push("");
    parts.push(`DROP DATABASE IF EXISTS \`${dbName}\`;`);
    parts.push(
      `CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
    );
    parts.push(`USE \`${dbName}\`;`);
    parts.push("");
    parts.push("-- ============================================================");
    parts.push("-- Schema");
    parts.push("-- ============================================================");
    parts.push(schemaSql.trim());
    parts.push("");
    parts.push("-- ============================================================");
    parts.push("-- Data");
    parts.push("-- ============================================================");
    parts.push("");

    for (const table of TABLES_IN_ORDER) {
      parts.push(await dumpTable(pool, table));
    }

    parts.push("SET FOREIGN_KEY_CHECKS = 1;");
    parts.push("");

    const outDir = path.join(__dirname, "..", "db");
    await fs.mkdir(outDir, { recursive: true });
    const outFile = path.join(outDir, `${dbName}.sql`);
    await fs.writeFile(outFile, parts.join("\n"), "utf8");
    console.log("Wrote", outFile);
  } catch (err) {
    console.error("Export failed:", err.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
})();
