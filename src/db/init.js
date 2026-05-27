const fs = require("node:fs/promises");
const path = require("node:path");
const mysql = require("mysql2/promise");
const { randomUUID } = require("node:crypto");
const { config } = require("../config/env");
const { PERIOD_BY_CYCLE } = require("../constants/report");
const { parseFileSummary, parseSizeToBytes, parseSubmittedAtLabel, toMysqlDatetime } = require("../utils/format");
const { getPool } = require("./pool");
const {
  ADMIN_NOTES_SEED,
  DEPARTMENTS,
  GENERAL_DIRECTORATES,
  REPORT_SEED_ROWS,
  TEAM_MEMBERS,
  USERS_SEED,
} = require("./seedData");

function findDepartmentBySubmitter(name) {
  return DEPARTMENTS.find((d) => d.submitterNames.includes(name)) || DEPARTMENTS[0];
}

async function ensureDatabaseExists() {
  const conn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
  });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.end();
}

async function runSchema() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const sql = await fs.readFile(schemaPath, "utf8");
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const pool = getPool();
  for (const statement of statements) {
    await pool.query(statement);
  }
}

async function isSeeded() {
  const pool = getPool();
  const [rows] = await pool.query("SELECT COUNT(*) AS count FROM reports");
  return Number(rows[0].count) > 0;
}

async function seedDatabase() {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const gd of GENERAL_DIRECTORATES) {
      await conn.query("INSERT IGNORE INTO general_directorates (id, name) VALUES (?, ?)", [gd.id, gd.name]);
      for (const dept of gd.departments) {
        await conn.query(
          "INSERT IGNORE INTO departments (id, general_directorate_id, name) VALUES (?, ?, ?)",
          [dept.id, gd.id, dept.name],
        );
      }
    }

    for (const user of USERS_SEED) {
      await conn.query(
        `INSERT IGNORE INTO users (id, email, password, role, name, courtesy_name, phone, department_id, initials)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        [user.id, user.email, user.password, user.role, user.name, user.courtesyName, user.phone, user.departmentId],
      );
    }

    const userByName = new Map();
    for (const member of TEAM_MEMBERS) {
      const department = findDepartmentBySubmitter(member.name);
      const userId = `u-member-${member.id}`;
      const courtesyName = member.name.split(" ")[0] || "លោក";
      await conn.query(
        `INSERT IGNORE INTO users (id, email, password, role, name, courtesy_name, phone, department_id, initials)
         VALUES (?, ?, ?, 'user', ?, ?, ?, ?, ?)`,
        [userId, `member${member.id}`, "password", member.name, courtesyName, "+855 12 000 000", department.id, member.initials],
      );
      userByName.set(member.name, { id: userId, name: member.name });
    }

    const submitterNames = TEAM_MEMBERS.map((m) => m.name);
    for (let index = 0; index < REPORT_SEED_ROWS.length; index += 1) {
      const row = REPORT_SEED_ROWS[index];
      const submitterName = submitterNames[index % submitterNames.length];
      const submitter = userByName.get(submitterName);
      const department = findDepartmentBySubmitter(submitterName);
      const submittedAt = parseSubmittedAtLabel(row.submittedAtLabel) || new Date();
      const submittedMysql = toMysqlDatetime(submittedAt);
      const reviewedMysql = row.status === "reviewed" ? submittedMysql : null;

      await conn.query(
        `INSERT IGNORE INTO reports
         (id, title, cycle, status, description, period_label, submitted_at, updated_at, submitter_id, department_id, general_directorate_id, reviewed_at, reviewer_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.id,
          row.documentTitle,
          row.cycle,
          row.status,
          row.description || null,
          PERIOD_BY_CYCLE[row.cycle],
          submittedMysql,
          submittedMysql,
          submitter.id,
          department.id,
          department.generalDirectorateId,
          reviewedMysql,
          row.status === "reviewed" ? "សុំ ចិន្តា" : null,
        ],
      );

      const parsed = parseFileSummary(row.fileSummary);
      const fileTypes = [];
      if (parsed.hasPdf) fileTypes.push("pdf");
      if (parsed.hasWord) fileTypes.push("word");
      if (!fileTypes.length) fileTypes.push("pdf");
      const defaultBytes = parseSizeToBytes(parsed.sizeLabel) || 1024 * 1024;

      for (const type of fileTypes) {
        await conn.query(
          `INSERT IGNORE INTO report_files
           (id, report_id, file_type, original_name, stored_name, size_bytes, pages, uploaded_at, is_resubmission)
           VALUES (?, ?, ?, ?, ?, ?, 0, ?, 0)`,
          [
            randomUUID(),
            row.id,
            type,
            `seed-${row.id}-${type}.${type === "pdf" ? "pdf" : "docx"}`,
            `seed-${row.id}-${type}`,
            defaultBytes,
            submittedMysql,
          ],
        );
      }

      await conn.query(
        `INSERT IGNORE INTO report_activity_logs
         (id, report_id, actor_id, actor_name, action, from_status, to_status, message, metadata_json, created_at)
         VALUES (?, ?, ?, ?, 'created', NULL, 'pending', 'Report submitted (seed)', NULL, ?)`,
        [randomUUID(), row.id, submitter.id, submitter.name, submittedMysql],
      );

      if (row.status === "reviewed") {
        await conn.query(
          `INSERT IGNORE INTO report_activity_logs
           (id, report_id, actor_id, actor_name, action, from_status, to_status, message, metadata_json, created_at)
           VALUES (?, ?, ?, ?, 'status_changed', 'pending', 'reviewed', 'Report reviewed (seed)', NULL, ?)`,
          [randomUUID(), row.id, "u-admin", "សុំ ចិន្តា", submittedMysql],
        );
      }

      const notes = ADMIN_NOTES_SEED[row.id];
      if (notes) {
        for (const note of notes) {
          await conn.query(
            `INSERT IGNORE INTO admin_notes (id, report_id, text, author, time_label, kind, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [randomUUID(), row.id, note.text, note.author, note.timeLabel, note.kind, submittedMysql],
          );
          await conn.query(
            `INSERT IGNORE INTO report_activity_logs
             (id, report_id, actor_id, actor_name, action, from_status, to_status, message, metadata_json, created_at)
             VALUES (?, ?, ?, ?, 'note_added', NULL, NULL, ?, ?, ?)`,
            [
              randomUUID(),
              row.id,
              "u-admin",
              note.author,
              note.kind === "request-files" ? "Admin requested file resubmission" : "Admin added a note",
              JSON.stringify({ kind: note.kind }),
              submittedMysql,
            ],
          );
        }
      }
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function initializeDatabase() {
  await ensureDatabaseExists();
  await runSchema();
  if (!(await isSeeded())) {
    await seedDatabase();
  }
}

module.exports = { initializeDatabase };
