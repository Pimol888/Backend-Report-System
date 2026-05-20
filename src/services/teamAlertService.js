const { getDb, updateDb } = require("../db");

async function listTeamAlerts() {
  const db = await getDb();
  const teamAlerts = Array.isArray(db.teamAlerts) ? [...db.teamAlerts] : [];
  return teamAlerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function getTeamAlertById(id) {
  const db = await getDb();
  const numId = Number(id);
  const alert = (db.teamAlerts || []).find((a) => a.id === numId);
  return alert || null;
}

async function createTeamAlert(payload) {
  await updateDb(async (db) => {
    if (!Array.isArray(db.teamAlerts)) db.teamAlerts = [];
    if (typeof db.lastTeamAlertId !== "number") db.lastTeamAlertId = 0;
    const nextId = db.lastTeamAlertId + 1;
    db.lastTeamAlertId = nextId;

    const alert = {
      id: nextId,
      title: String(payload.title).trim(),
      message: String(payload.message ?? "").trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.teamAlerts.push(alert);
  });

  const db = await getDb();
  const created = (db.teamAlerts || []).slice(-1)[0];
  return created;
}

async function updateTeamAlert(id, payload) {
  let updated = null;
  await updateDb(async (db) => {
    const numId = Number(id);
    const alert = (db.teamAlerts || []).find((a) => a.id === numId);
    if (!alert) return;
    if (payload.title !== undefined) alert.title = String(payload.title).trim();
    if (payload.message !== undefined) alert.message = String(payload.message).trim();
    alert.updatedAt = new Date().toISOString();
    updated = alert;
  });
  return updated;
}

async function deleteTeamAlert(id) {
  let found = false;
  await updateDb(async (db) => {
    if (!Array.isArray(db.teamAlerts)) db.teamAlerts = [];
    const numId = Number(id);
    const idx = db.teamAlerts.findIndex((a) => a.id === numId);
    if (idx === -1) return;
    db.teamAlerts.splice(idx, 1);
    found = true;
  });
  return found;
}

module.exports = {
  listTeamAlerts,
  getTeamAlertById,
  createTeamAlert,
  updateTeamAlert,
  deleteTeamAlert,
};
