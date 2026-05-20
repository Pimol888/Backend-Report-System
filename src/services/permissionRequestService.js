const { getDb, updateDb } = require("../db");

function enrichWithAdminUsername(db, request) {
  if (!request) return request;
  const admin = (db.admins || []).find((a) => a.id === request.adminId);
  return { ...request, adminUsername: admin ? admin.username : null };
}

async function listPermissionRequests({ adminId = null, superAdmin = false } = {}) {
  const db = await getDb();
  let list = Array.isArray(db.permissionRequests) ? [...db.permissionRequests] : [];
  if (!superAdmin && adminId) {
    list = list.filter((r) => r.adminId === adminId);
  }
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return list.map((r) => enrichWithAdminUsername(db, r));
}

async function getPermissionRequestById(id) {
  const db = await getDb();
  const numId = Number(id);
  const req = (db.permissionRequests || []).find((r) => r.id === numId);
  return req ? enrichWithAdminUsername(db, req) : null;
}

async function createPermissionRequest(payload, adminId) {
  await updateDb(async (db) => {
    if (!Array.isArray(db.permissionRequests)) db.permissionRequests = [];
    if (typeof db.lastPermissionRequestId !== "number") db.lastPermissionRequestId = 0;
    const nextId = db.lastPermissionRequestId + 1;
    db.lastPermissionRequestId = nextId;

    const record = {
      id: nextId,
      adminId,
      status: payload.status,
      reason: payload.reason,
      approvalStatus: "pending",
      reviewedBy: null,
      reviewedAt: null,
      reviewComment: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (payload.status === "late") {
      record.arrivalTime = payload.arrivalTime;
    } else if (payload.status === "leave_early") {
      record.leaveTime = payload.leaveTime;
    } else if (payload.status === "absent") {
      record.fromDate = payload.fromDate;
      record.toDate = payload.toDate;
      record.totalDays = payload.totalDays;
    } else if (payload.status === "out_of_office") {
      record.startTime = payload.startTime;
      record.endTime = payload.endTime;
      record.location = payload.location;
    }

    db.permissionRequests.push(record);
  });

  const db = await getDb();
  const created = (db.permissionRequests || []).slice(-1)[0];
  return enrichWithAdminUsername(db, created);
}

async function updatePermissionRequestApproval(id, payload, superAdminId) {
  let updated = null;
  await updateDb(async (db) => {
    const numId = Number(id);
    const req = (db.permissionRequests || []).find((r) => r.id === numId);
    if (!req) return;
    if (req.approvalStatus !== "pending") return;
    req.approvalStatus = payload.approvalStatus;
    req.reviewComment = payload.reviewComment ?? "";
    req.reviewedBy = superAdminId;
    req.reviewedAt = new Date().toISOString();
    req.updatedAt = new Date().toISOString();
    updated = req;
  });
  if (!updated) return null;
  const db = await getDb();
  return enrichWithAdminUsername(db, updated);
}

module.exports = {
  listPermissionRequests,
  getPermissionRequestById,
  createPermissionRequest,
  updatePermissionRequestApproval,
};
