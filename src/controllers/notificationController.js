const {
  getNotificationsByAdminId,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
  deleteNotification,
  deleteNotificationsByTicketId,
} = require("../models/notification");
const HttpError = require("../utils/httpError");

async function listNotifications(req, res) {
  const adminId = req.admin?.sub;
  if (!adminId) throw new HttpError(401, "Unauthorized");
  const notifications = await getNotificationsByAdminId(adminId);
  return res.json({ notifications });
}

async function getUnreadCountHandler(req, res) {
  const adminId = req.admin?.sub;
  if (!adminId) throw new HttpError(401, "Unauthorized");
  const count = await getUnreadCount(adminId);
  return res.json({ count });
}

async function markAsRead(req, res) {
  const adminId = req.admin?.sub;
  if (!adminId) throw new HttpError(401, "Unauthorized");
  const { id } = req.params;
  const notification = await markNotificationAsRead(id, adminId);
  if (!notification) throw new HttpError(404, "Notification not found");
  return res.json({ notification });
}

async function markAllAsRead(req, res) {
  const adminId = req.admin?.sub;
  if (!adminId) throw new HttpError(401, "Unauthorized");
  const count = await markAllNotificationsAsRead(adminId);
  return res.json({ count });
}

async function deleteNotificationHandler(req, res) {
  const adminId = req.admin?.sub;
  const role = req.admin?.role;
  if (!adminId) throw new HttpError(401, "Unauthorized");
  const { id } = req.params;
  const notification = await deleteNotification(id, adminId);
  if (!notification) throw new HttpError(404, "Notification not found");
  // When super_admin confirms "work done", remove all notifications for that ticket
  // so admins no longer see "You have been assigned to..." for that ticket.
  if (role === "super_admin" && notification.type === "work_done" && notification.ticketId != null) {
    const deletedCount = await deleteNotificationsByTicketId(notification.ticketId);
    // Log for debugging: how many notifications were deleted for this ticket
    console.log(`[Notification] Super admin confirmed work done for ticket ${notification.ticketId}. Deleted ${deletedCount} total notifications.`);
    // Broadcast to all admins so they refresh and see notifications disappear
    const io = req.app.get("io");
    if (io) io.to("admins").emit("notification:refresh", { ticketId: notification.ticketId });
  }
  return res.json({ success: true });
}

/** DELETE /notifications/by-ticket/:ticketId — super_admin only; delete all notifications for a ticket */
async function deleteNotificationsByTicketHandler(req, res) {
  const { ticketId } = req.params;
  const id = parseInt(ticketId, 10);
  if (isNaN(id)) throw new HttpError(400, "Invalid ticket ID");
  const deletedCount = await deleteNotificationsByTicketId(id);
  const io = req.app.get("io");
  if (io) io.to("admins").emit("notification:refresh", { ticketId: id });
  return res.json({ success: true, deletedCount });
}

module.exports = {
  listNotifications,
  getUnreadCount: getUnreadCountHandler,
  markAsRead,
  markAllAsRead,
  deleteNotification: deleteNotificationHandler,
  deleteNotificationsByTicket: deleteNotificationsByTicketHandler,
};
