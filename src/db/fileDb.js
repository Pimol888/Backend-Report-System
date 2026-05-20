/**
 * Local file-based DB (data/db.json).
 * All data access goes through getDb() / updateDb() so this can be swapped
 * for a MySQL adapter later without changing services.
 */
const fs = require("fs/promises");
const path = require("path");

const DB_PATH = path.join(process.cwd(), "data", "db.json");

// serialize writes (prevents race issues)
let writeLock = Promise.resolve();

async function ensureDbFile() {
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    const initial = { lastTicketId: 0, tickets: [] };
    await fs.writeFile(DB_PATH, JSON.stringify(initial, null, 2), "utf-8");
  }
}

async function getDb() {
  await ensureDbFile();
  const raw = await fs.readFile(DB_PATH, "utf-8");
  const db = JSON.parse(raw || "{}");

  // ensure structure
  if (!Array.isArray(db.tickets)) db.tickets = [];
  if (typeof db.lastTicketId !== "number") db.lastTicketId = 0;
  if (typeof db.lastAlertId !== "number") db.lastAlertId = 0;
  if (!Array.isArray(db.admins)) db.admins = [];
  if (!Array.isArray(db.adminResetTokens)) db.adminResetTokens = [];
  if (!Array.isArray(db.users)) db.users = [];
  if (!Array.isArray(db.userResetTokens)) db.userResetTokens = [];
  if (!Array.isArray(db.alerts)) db.alerts = [];
  if (!Array.isArray(db.teamAlerts)) db.teamAlerts = [];
  if (typeof db.lastTeamAlertId !== "number") db.lastTeamAlertId = 0;
  if (!Array.isArray(db.permissionRequests)) db.permissionRequests = [];
  if (typeof db.lastPermissionRequestId !== "number") db.lastPermissionRequestId = 0;
  if (!Array.isArray(db.meetingNotes)) db.meetingNotes = [];
  if (typeof db.lastMeetingNoteId !== "number") db.lastMeetingNoteId = 0;
  // calendarNotes: Record<adminId, Record<date, { note, images }>>
  if (typeof db.calendarNotes !== "object" || db.calendarNotes === null) db.calendarNotes = {};
  if (!Array.isArray(db.notifications)) db.notifications = [];
  if (!Array.isArray(db.workLogs)) db.workLogs = [];
  if (!Array.isArray(db.workFollowers)) db.workFollowers = [];

  return db;
}

async function updateDb(mutatorFn) {
  writeLock = writeLock.then(async () => {
    const db = await getDb();
    const result = await mutatorFn(db);
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
    return result;
  });

  return writeLock;
}

module.exports = { getDb, updateDb };
