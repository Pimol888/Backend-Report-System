const { HttpError } = require("../utils/httpError");
const { deleteNotificationsByTicketIdAndType } = require("../models/notification");
const envModule = require("../config/env");
if (typeof envModule.getJwtExpiresInSeconds !== "function") {
  throw new Error("getJwtExpiresInSeconds is not exported correctly from config/env");
}
const getJwtExpiresInSeconds = envModule.getJwtExpiresInSeconds;
const {
  validateAdminLogin,
  validateAdminRegister,
  validateForgotPassword,
  validateResetPassword,
} = require("../validators/adminValidators");
const {
  loginAdmin,
  registerAdmin,
  requestPasswordReset,
  resetPassword,
} = require("../services/adminService");
const {
  listTicketsService,
  getTicketByIdService,
  updateTicketService,
} = require("../services/ticketService");
const { listStaffForAssignment } = require("../services/adminService");
const { validateAdminUpdateTicket } = require("../validators/ticketValidators");

async function login(req, res) {
  const validation = validateAdminLogin(req.body);
  if (!validation.ok) {
    throw new HttpError(400, validation.error);
  }
  const { token, admin } = await loginAdmin(validation.value);
  const user = { id: admin.id, name: admin.username, email: admin.email, role: admin.role || "admin" };
  return res.json({
    success: true,
    message: "Login successful",
    data: {
      user,
      accessToken: token,
      expiresIn: getJwtExpiresInSeconds(),
    },
  });
}

async function register(req, res) {
  const validation = validateAdminRegister(req.body);
  if (!validation.ok) throw new HttpError(400, validation.error);
  const { admin } = await registerAdmin(validation.value);
  const user = {
    id: admin.id,
    name: admin.username,
    email: admin.email,
    role: admin.role || "admin",
    createdAt: admin.createdAt,
  };
  return res.status(201).json({
    success: true,
    message: "Account created successfully",
    data: { user },
  });
}

async function me(req, res) {
  const admin = req.admin;
  const user = { id: admin.sub, name: admin.username, email: admin.email ?? null, role: admin.role || "admin" };
  return res.json({
    success: true,
    message: "Profile fetched successfully",
    data: { user },
  });
}

async function tickets(req, res) {
  const { tickets: ticketsList, meta } = await listTicketsService(req.query || {});
  return res.json({ tickets: ticketsList, meta });
}

async function ticketById(req, res) {
  const ticket = await getTicketByIdService(req.params.id);
  if (!ticket) throw new HttpError(404, "Ticket not found");
  return res.json({ ticket });
}

async function staff(req, res) {
  const staffList = await listStaffForAssignment();
  return res.json({ staff: staffList });
}

async function forgotPassword(req, res) {
  const validation = validateForgotPassword(req.body);
  if (!validation.ok) throw new HttpError(400, validation.error);
  const result = await requestPasswordReset(validation.value);
  return res.json({
    success: true,
    message: "If the username exists, a 6-digit reset code has been generated. Use it in reset-password.",
    data: {
      resetCode: result.resetCode,
      expiresIn: result.expiresIn,
    },
  });
}

async function resetPasswordHandler(req, res) {
  const validation = validateResetPassword(req.body);
  if (!validation.ok) throw new HttpError(400, validation.error);
  await resetPassword(validation.value);
  return res.json({
    success: true,
    message: "Password reset successfully",
  });
}

async function patchTicket(req, res) {
  const validation = validateAdminUpdateTicket(req.body);
  if (!validation.ok) {
    throw new HttpError(400, "Validation error", { details: { errors: validation.errors } });
  }
  const allowAssignedStaff = req.admin && req.admin.role === "super_admin";
  const currentAdminId = req.admin?.sub ?? req.admin?.id ?? null;
  const closedByAdmin = currentAdminId != null && req.admin?.username
    ? { id: currentAdminId, name: req.admin.username }
    : null;
  const result = await updateTicketService(req.params.id, validation.value, [], {
    isAdmin: true,
    solutionFile: req.file,
    allowAssignedStaff,
    excludeWorkDoneForAdminId: currentAdminId,
    closedByAdmin,
  });
  const ticket = result.ticket;

  // When staff is assigned, remove "new_ticket" notifications for this ticket
  if ((result.createdAssignmentNotifications || []).length > 0) {
    await deleteNotificationsByTicketIdAndType(ticket.id, "new_ticket");
  }

  const io = req.app.get("io");
  if (io) {
    // Emit real-time notification to each assigned admin
    const assigned = result.createdAssignmentNotifications || [];
    for (const notif of assigned) {
      io.to(`admin:${notif.adminId}`).emit("notification:new", { notification: notif });
    }
    // Emit real-time notification to each super_admin when ticket is closed
    const workDone = result.createdWorkDoneNotifications || [];
    for (const notif of workDone) {
      io.to(`admin:${notif.adminId}`).emit("notification:new", { notification: notif });
    }
  }

  return res.json({ ticket });
}

module.exports = {
  login,
  register,
  me,
  forgotPassword,
  resetPasswordHandler,
  tickets,
  ticketById,
  patchTicket,
  staff,
};

