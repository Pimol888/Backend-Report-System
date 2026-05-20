const { HttpError } = require("../utils/httpError");
const { validateAdminUpdateTicket } = require("../validators/ticketValidators");
const { updateTicketService, listTicketsService } = require("../services/ticketService");

function ok(res, message, data, status = 200, extra = {}) {
  return res.status(status).json({ success: true, message, data, ...extra });
}

// Optional: admin can list too (same as public, but you can add more filters later)
async function adminListTickets(req, res) {
  const { tickets, meta } = await listTicketsService(req.query);
  return ok(res, "Admin tickets fetched successfully", { tickets }, 200, { meta });
}

async function adminUpdateTicket(req, res) {
  const validation = validateAdminUpdateTicket(req.body);
  if (!validation.ok) {
    throw new HttpError(400, "Invalid admin update payload", { errors: validation.errors });
  }

  const isSuperAdmin = req.admin && req.admin.role === "super_admin";
  const currentAdminId = req.admin?.sub ?? req.admin?.id ?? null;
  
  // Get admin username - from token or fetch from DB if missing
  let adminUsername = req.admin?.username;
  if (!adminUsername && currentAdminId) {
    const { getDb } = require("../db");
    const db = await getDb();
    const adminRecord = (db.admins || []).find((a) => String(a.id) === String(currentAdminId));
    adminUsername = adminRecord?.username;
  }
  
  const closedByAdmin = currentAdminId != null && adminUsername
    ? { id: currentAdminId, name: adminUsername }
    : null;
  
  // Debug log
  if (validation.value.status === "done") {
    console.log("[DEBUG] Closing ticket:", {
      ticketId: req.params.id,
      currentAdminId,
      adminUsername,
      closedByAdmin,
      reqAdmin: req.admin
    });
  }
  const result = await updateTicketService(
    req.params.id,
    validation.value,
    req.files || [],
    { isAdmin: true, allowAssignedStaff: isSuperAdmin, excludeWorkDoneForAdminId: currentAdminId, closedByAdmin }
  );
  const ticket = result.ticket;

  const io = req.app.get("io");
  if (io) {
    const assigned = result.createdAssignmentNotifications || [];
    for (const notif of assigned) {
      io.to(`admin:${notif.adminId}`).emit("notification:new", { notification: notif });
    }
    const workDone = result.createdWorkDoneNotifications || [];
    for (const notif of workDone) {
      io.to(`admin:${notif.adminId}`).emit("notification:new", { notification: notif });
    }
  }

  return ok(res, "Ticket updated by admin", { ticket });
}

module.exports = {
  adminListTickets,
  adminUpdateTicket,
};
