const { getDb, updateDb } = require("../db");
const { HttpError } = require("../utils/httpError");

async function listAlerts() {
  const db = await getDb();
  const alerts = Array.isArray(db.alerts) ? [...db.alerts] : [];
  return alerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function getAlertById(id) {
  const db = await getDb();
  const numId = Number(id);
  const alert = (db.alerts || []).find((a) => a.id === numId);
  return alert || null;
}

async function createAlert(payload) {
  await updateDb(async (db) => {
    if (!Array.isArray(db.alerts)) db.alerts = [];
    if (typeof db.lastAlertId !== "number") db.lastAlertId = 0;
    const nextId = db.lastAlertId + 1;
    db.lastAlertId = nextId;

    const alert = {
      id: nextId,
      title: String(payload.title).trim(),
      message: String(payload.message ?? "").trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.alerts.push(alert);
  });

  const db = await getDb();
  const created = (db.alerts || []).slice(-1)[0];
  return created;
}

async function updateAlert(id, payload) {
  let updated = null;
  await updateDb(async (db) => {
    const numId = Number(id);
    const alert = (db.alerts || []).find((a) => a.id === numId);
    if (!alert) return;
    if (payload.title !== undefined) alert.title = String(payload.title).trim();
    if (payload.message !== undefined) alert.message = String(payload.message).trim();
    alert.updatedAt = new Date().toISOString();
    updated = alert;
  });
  return updated;
}

async function deleteAlert(id) {
  let found = false;
  await updateDb(async (db) => {
    if (!Array.isArray(db.alerts)) db.alerts = [];
    const numId = Number(id);
    const idx = db.alerts.findIndex((a) => a.id === numId);
    if (idx === -1) return;
    db.alerts.splice(idx, 1);
    found = true;
  });
  return found;
}

module.exports = {
  listAlerts,
  getAlertById,
  createAlert,
  updateAlert,
  deleteAlert,
};
