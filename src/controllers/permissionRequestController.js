const { HttpError } = require("../utils/httpError");
const { getDb } = require("../db");
const { createNotification, deleteNotificationsByPermissionRequestId } = require("../models/notification");
const {
  validateCreatePermissionRequest,
  validateApproveReject,
} = require("../validators/permissionRequestValidators");
const {
  listPermissionRequests,
  getPermissionRequestById,
  createPermissionRequest,
  updatePermissionRequestApproval,
} = require("../services/permissionRequestService");

const STATUS_LABELS = { late: "យឺត", leave_early: "ចាកចេញមុន", absent: "អវត្តមាន", out_of_office: "ទៅក្រៅការិយាល័យ" };

async function list(req, res) {
  const isSuperAdmin = req.admin?.role === "super_admin";
  const adminId = req.admin?.sub ?? null;
  const requests = await listPermissionRequests({
    adminId,
    superAdmin: isSuperAdmin,
  });
  return res.json({ success: true, data: { permissionRequests: requests } });
}

async function getById(req, res) {
  const request = await getPermissionRequestById(req.params.id);
  if (!request) throw new HttpError(404, "Permission request not found");
  const isSuperAdmin = req.admin?.role === "super_admin";
  if (!isSuperAdmin && request.adminId !== req.admin?.sub) {
    throw new HttpError(403, "You can only view your own permission requests");
  }
  return res.json({ success: true, data: { permissionRequest: request } });
}

async function create(req, res) {
  if (req.admin?.role === "super_admin") {
    throw new HttpError(403, "Super admin cannot create permission requests; use admin account");
  }
  const validation = validateCreatePermissionRequest(req.body);
  if (!validation.ok) throw new HttpError(400, validation.error);
  const adminId = req.admin?.sub;
  if (!adminId) throw new HttpError(401, "Admin identity required");
  const permissionRequest = await createPermissionRequest(validation.value, adminId);

  // Notify all super_admins of the new permission request
  const io = req.app.get("io");
  if (io) {
    const db = await getDb();
    const superAdmins = (db.admins || []).filter((a) => a.role === "super_admin");
    const admin = (db.admins || []).find((a) => String(a.id) === String(adminId));
    const adminUsername = admin ? admin.username : "អ្នកគ្រប់គ្រង";
    const statusLabel = STATUS_LABELS[permissionRequest.status] || permissionRequest.status;
    const reasonShort = String(permissionRequest.reason || "").slice(0, 60);
    const message = `${adminUsername} បានស្នើរសុំច្បាប់ (${statusLabel}): ${reasonShort}${reasonShort.length >= 60 ? "…" : ""}`;
    for (const sa of superAdmins) {
      const notif = await createNotification({
        adminId: sa.id,
        ticketId: 0,
        message,
        type: "permission_request",
        permissionRequestId: permissionRequest.id,
      });
      io.to(`admin:${notif.adminId}`).emit("notification:new", { notification: notif });
    }
    io.to("admins").emit("permission:created", { permissionRequest });
  }

  return res.status(201).json({
    success: true,
    message: "Permission request created",
    data: { permissionRequest },
  });
}

async function approveReject(req, res) {
  const validation = validateApproveReject(req.body);
  if (!validation.ok) throw new HttpError(400, validation.error);
  const request = await getPermissionRequestById(req.params.id);
  if (!request) throw new HttpError(404, "Permission request not found");
  if (request.approvalStatus !== "pending") {
    throw new HttpError(400, "Permission request is already reviewed");
  }
  const superAdminId = req.admin?.sub;
  if (!superAdminId) throw new HttpError(401, "Super admin identity required");
  const permissionRequest = await updatePermissionRequestApproval(
    req.params.id,
    validation.value,
    superAdminId
  );
  if (!permissionRequest) throw new HttpError(404, "Permission request not found");

  // Clear permission_request notifications for all super_admins (they no longer need to act)
  await deleteNotificationsByPermissionRequestId(permissionRequest.id, "permission_request");

  // Notify the requesting admin of the approval or rejection
  const io = req.app.get("io");
  if (io && request.adminId) {
    const isApproved = validation.value.approvalStatus === "approved";
    const message = isApproved
      ? "សំណើរសុំច្បាប់របស់អ្នកត្រូវបានអនុម័តរួចហើយ"
      : "សំណើរសុំច្បាប់របស់អ្នកត្រូវបានបដិសេធរួចហើយ";
    const notif = await createNotification({
      adminId: request.adminId,
      ticketId: 0,
      message,
      type: isApproved ? "permission_approved" : "permission_rejected",
      permissionRequestId: permissionRequest.id,
    });
    io.to(`admin:${notif.adminId}`).emit("notification:new", { notification: notif });
  }
  // Broadcast refresh so super_admins see permission_request notifications cleared
  if (io) {
    io.to("admins").emit("notification:refresh");
    io.to("admins").emit("permission:reviewed", { permissionRequest });
  }

  return res.json({
    success: true,
    message: `Permission request ${validation.value.approvalStatus}`,
    data: { permissionRequest },
  });
}

module.exports = {
  list,
  getById,
  create,
  approveReject,
};
