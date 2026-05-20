const mysql = require("mysql2/promise");
const { randomUUID } = require("node:crypto");
const { config } = require("../config/env");
const {
  ADMIN_NOTES_SEED,
  DEPARTMENTS,
  GENERAL_DIRECTORATES,
  PERIOD_BY_CYCLE,
  REPORT_SEED_ROWS,
  TEAM_MEMBERS,
  USERS_SEED,
} = require("./seedData");
const { extensionByType, parseFileSummary, parseSizeToBytes, parseSubmittedAtLabel } = require("./helpers");

const STATE_KEY = "report-system";
let pool = null;

function findDepartmentBySubmitter(name) {
  return DEPARTMENTS.find((d) => d.submitterNames.includes(name)) || DEPARTMENTS[0];
}

function buildSeedDatabase() {
  const users = [...USERS_SEED];
  const reports = [];
  const reportFiles = [];
  const reportNotes = [];
  const submitterNames = TEAM_MEMBERS.map((m) => m.name);
  const userByName = new Map();

  for (const member of TEAM_MEMBERS) {
    const department = findDepartmentBySubmitter(member.name);
    const user = {
      id: `u-member-${member.id}`,
      email: `member${member.id}`,
      password: "password",
      role: "user",
      name: member.name,
      departmentId: department.id,
      courtesyName: member.name.split(" ")[0] || "លោក",
      phone: "+855 12 000 000",
    };
    users.push(user);
    userByName.set(member.name, user);
  }

  REPORT_SEED_ROWS.forEach((row, index) => {
    const submitterName = submitterNames[index % submitterNames.length];
    const submitter = userByName.get(submitterName) || users.find((u) => u.role === "user");
    const department = findDepartmentBySubmitter(submitterName);
    const submittedAt = parseSubmittedAtLabel(row.submittedAtLabel) || new Date();
    const reportId = row.id;
    const report = {
      id: reportId,
      title: row.documentTitle,
      cycle: row.cycle,
      status: row.status,
      description: row.description || null,
      submittedAt: submittedAt.toISOString(),
      periodLabel: PERIOD_BY_CYCLE[row.cycle],
      submitterId: submitter.id,
      submitterName,
      departmentId: department.id,
      generalDirectorateId: department.generalDirectorateId,
      reviewedAt: row.status === "reviewed" ? submittedAt.toISOString() : null,
      reviewerName: row.status === "reviewed" ? "សុំ ចិន្តា" : null,
    };
    reports.push(report);

    const parsed = parseFileSummary(row.fileSummary);
    const fileTypes = [];
    if (parsed.hasPdf) fileTypes.push("pdf");
    if (parsed.hasWord) fileTypes.push("word");
    if (!fileTypes.length) fileTypes.push("pdf");
    const defaultBytes = parseSizeToBytes(parsed.sizeLabel) || 1024 * 1024;

    fileTypes.forEach((type) => {
      reportFiles.push({
        id: randomUUID(),
        reportId,
        type,
        name: `report-${row.cycle}-${row.id}${extensionByType(type)}`,
        storedName: `seed-${row.id}-${type}${extensionByType(type)}`,
        sizeBytes: defaultBytes,
        pages: type === "pdf" ? 24 : 18,
        uploadedAt: submittedAt.toISOString(),
        source: "seed",
      });
    });
  });

  for (const [reportId, notes] of Object.entries(ADMIN_NOTES_SEED)) {
    notes.forEach((note) => {
      reportNotes.push({
        id: randomUUID(),
        reportId,
        text: note.text,
        author: note.author,
        timeLabel: note.timeLabel,
        kind: note.kind || "comment",
        createdAt: new Date().toISOString(),
      });
    });
  }

  return {
    meta: { version: 1, createdAt: new Date().toISOString() },
    users,
    departments: DEPARTMENTS,
    generalDirectorates: GENERAL_DIRECTORATES,
    teamMembers: TEAM_MEMBERS,
    reports,
    reportFiles,
    reportNotes,
  };
}

function getPool() {
  if (pool) return pool;
  pool = mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    connectionLimit: config.db.connectionLimit || 10,
    charset: "utf8mb4",
  });
  return pool;
}

async function normalizeDbShape(db) {
  db.users = Array.isArray(db.users) ? db.users : [];
  db.departments = Array.isArray(db.departments) ? db.departments : [];
  db.generalDirectorates = Array.isArray(db.generalDirectorates) ? db.generalDirectorates : [];
  db.teamMembers = Array.isArray(db.teamMembers) ? db.teamMembers : [];
  db.reports = Array.isArray(db.reports) ? db.reports : [];
  db.reportFiles = Array.isArray(db.reportFiles) ? db.reportFiles : [];
  db.reportNotes = Array.isArray(db.reportNotes) ? db.reportNotes : [];
  return db;
}

async function initializeDatabase() {
  const root = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    charset: "utf8mb4",
  });
  try {
    await root.query(`CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  } finally {
    await root.end();
  }

  const p = getPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      state_key VARCHAR(64) PRIMARY KEY,
      state_json LONGTEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [rows] = await p.query("SELECT state_json FROM app_state WHERE state_key = ? LIMIT 1", [STATE_KEY]);
  if (!Array.isArray(rows) || rows.length === 0) {
    const seed = JSON.stringify(buildSeedDatabase());
    await p.query("INSERT INTO app_state (state_key, state_json) VALUES (?, ?)", [STATE_KEY, seed]);
  }
}

async function getDb() {
  const p = getPool();
  const [rows] = await p.query("SELECT state_json FROM app_state WHERE state_key = ? LIMIT 1", [STATE_KEY]);
  if (!Array.isArray(rows) || rows.length === 0) {
    const seed = buildSeedDatabase();
    await p.query("INSERT INTO app_state (state_key, state_json) VALUES (?, ?)", [STATE_KEY, JSON.stringify(seed)]);
    return normalizeDbShape(seed);
  }
  const raw = rows[0].state_json;
  const parsed = typeof raw === "string" ? JSON.parse(raw || "{}") : raw;
  return normalizeDbShape(parsed || {});
}

async function updateDb(mutator) {
  const p = getPool();
  const conn = await p.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query("SELECT state_json FROM app_state WHERE state_key = ? FOR UPDATE", [STATE_KEY]);
    const current = Array.isArray(rows) && rows[0]
      ? JSON.parse(rows[0].state_json || "{}")
      : buildSeedDatabase();
    const db = await normalizeDbShape(current);
    const result = await mutator(db);
    const stateJson = JSON.stringify(db);
    if (Array.isArray(rows) && rows[0]) {
      await conn.query("UPDATE app_state SET state_json = ? WHERE state_key = ?", [stateJson, STATE_KEY]);
    } else {
      await conn.query("INSERT INTO app_state (state_key, state_json) VALUES (?, ?)", [STATE_KEY, stateJson]);
    }
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  closeDb,
  getDb,
  initializeDatabase,
  updateDb,
};
