const { getDb, updateDb } = require("../db");

/**
 * Notification model for assigned staff notifications and permission requests.
 * ticketId: use 0 for permission-related notifications (not ticket-related).
 * permissionRequestId: optional, for permission_request, permission_approved, permission_rejected.
 */
async function createNotification({ adminId, ticketId, message, type = "assigned", permissionRequestId = null }) {
  let notification;
  await updateDb(async (db) => {
    if (!db.notifications) db.notifications = [];
    notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      adminId: String(adminId),
      ticketId: ticketId != null ? Number(ticketId) : 0,
      message: String(message),
      type: String(type),
      read: false,
      createdAt: new Date().toISOString(),
    };
    if (permissionRequestId != null) {
      notification.permissionRequestId = Number(permissionRequestId);
    }
    db.notifications.push(notification);
  });
  return notification;
}

async function getNotificationsByAdminId(adminId) {
  const db = await getDb();
  const notifications = (db.notifications || []).filter(
    (n) => String(n.adminId) === String(adminId)
  );
  return notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function markNotificationAsRead(notificationId, adminId) {
  let notification = null;
  await updateDb(async (db) => {
    notification = (db.notifications || []).find(
      (n) => n.id === notificationId && String(n.adminId) === String(adminId)
    );
    if (notification) {
      notification.read = true;
      notification.readAt = new Date().toISOString();
    }
  });
  return notification;
}

async function markAllNotificationsAsRead(adminId) {
  let count = 0;
  await updateDb(async (db) => {
    const notifications = (db.notifications || []).filter(
      (n) => String(n.adminId) === String(adminId) && !n.read
    );
    const now = new Date().toISOString();
    notifications.forEach((n) => {
      n.read = true;
      n.readAt = now;
    });
    count = notifications.length;
  });
  return count;
}

async function getUnreadCount(adminId) {
  const db = await getDb();
  return (db.notifications || []).filter(
    (n) => String(n.adminId) === String(adminId) && !n.read
  ).length;
}

/**
 * Delete one notification by id for the given admin. Returns the deleted notification
 * (so caller can read ticketId/type) or null if not found.
 */
async function deleteNotification(notificationId, adminId) {
  let deletedNotification = null;
  await updateDb(async (db) => {
    const index = (db.notifications || []).findIndex(
      (n) => n.id === notificationId && String(n.adminId) === String(adminId)
    );
    if (index !== -1) {
      deletedNotification = { ...db.notifications[index] };
      db.notifications.splice(index, 1);
    }
  });
  return deletedNotification;
}

/**
 * Delete all notifications for a given ticket (any admin, any type).
 * Used when super_admin confirms "work done" so admins no longer see "assigned" for that ticket.
 */
async function deleteNotificationsByTicketId(ticketId) {
  let count = 0;
  await updateDb(async (db) => {
    if (!db.notifications) return;
    const before = db.notifications.length;
    db.notifications = db.notifications.filter(
      (n) => Number(n.ticketId) !== Number(ticketId)
    );
    count = before - db.notifications.length;
  });
  return count;
}

/**
 * Delete all permission_request notifications for a given permissionRequestId.
 * Used when super_admin approves/rejects — clear those notifications for all super_admins.
 */
async function deleteNotificationsByPermissionRequestId(permissionRequestId, type = "permission_request") {
  let count = 0;
  await updateDb(async (db) => {
    if (!db.notifications) return;
    const before = db.notifications.length;
    db.notifications = db.notifications.filter(
      (n) => Number(n.permissionRequestId) !== Number(permissionRequestId) || String(n.type) !== String(type)
    );
    count = before - db.notifications.length;
  });
  return count;
}

/**
 * Delete notifications for a given ticket and type (e.g. "new_ticket").
 * Used when super_admin assigns staff — clear "new ticket" notifications for that ticket.
 */
async function deleteNotificationsByTicketIdAndType(ticketId, type) {
  let count = 0;
  await updateDb(async (db) => {
    if (!db.notifications) return;
    const before = db.notifications.length;
    db.notifications = db.notifications.filter(
      (n) => Number(n.ticketId) !== Number(ticketId) || String(n.type) !== String(type)
    );
    count = before - db.notifications.length;
  });
  return count;
}

module.exports = {
  createNotification,
  getNotificationsByAdminId,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
  deleteNotification,
  deleteNotificationsByTicketId,
  deleteNotificationsByTicketIdAndType,
  deleteNotificationsByPermissionRequestId,
};
