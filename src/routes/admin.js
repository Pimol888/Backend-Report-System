const express = require("express");
const { adminAuth } = require("../middleware/adminAuth");
const { superAdminAuth } = require("../middleware/superAdminAuth");
const { asyncHandler } = require("../middleware/asyncHandler");
const { optionalSingle, optionalSingleMeetingNote } = require("../middleware/upload");
const adminController = require("../controllers/adminController");
const alertController = require("../controllers/alertController");
const teamAlertController = require("../controllers/teamAlertController");
const meetingNoteController = require("../controllers/meetingNoteController");
const calendarNoteController = require("../controllers/calendarNoteController");
const permissionRequestController = require("../controllers/permissionRequestController");
const notificationController = require("../controllers/notificationController");

const router = express.Router();

// Public path: login only (for frontend that still calls /api/admin/login). Same logic as /api/auth/login for admin/super_admin.
const PUBLIC_PATHS = ["/login"];

function protectAdminRoutes(req, res, next) {
  const isPublic = req.method === "POST" && PUBLIC_PATHS.includes(req.path);
  if (isPublic) return next();
  return adminAuth(req, res, next);
}

router.use(protectAdminRoutes);

router.post("/login", asyncHandler(adminController.login));

// Protected (require Authorization: Bearer <token>)
router.get("/me", asyncHandler(adminController.me));
router.get("/staff", asyncHandler(adminController.staff));
router.get("/tickets", asyncHandler(adminController.tickets));
router.get("/tickets/:id", asyncHandler(adminController.ticketById));
router.patch(
  "/tickets/:id",
  optionalSingle("solution"),
  asyncHandler(adminController.patchTicket)
);

// Alerts (admin only: create, edit, delete)
router.get("/alerts", asyncHandler(alertController.list));
router.get("/alerts/:id", asyncHandler(alertController.getById));
router.post("/alerts", asyncHandler(alertController.create));
router.patch("/alerts/:id", asyncHandler(alertController.update));
router.delete("/alerts/:id", asyncHandler(alertController.remove));

// Team alerts (super_admin only: CRUD)
router.get("/team-alerts", superAdminAuth, asyncHandler(teamAlertController.list));
router.get("/team-alerts/:id", superAdminAuth, asyncHandler(teamAlertController.getById));
router.post("/team-alerts", superAdminAuth, asyncHandler(teamAlertController.create));
router.patch("/team-alerts/:id", superAdminAuth, asyncHandler(teamAlertController.update));
router.delete("/team-alerts/:id", superAdminAuth, asyncHandler(teamAlertController.remove));

// Meeting notes (super_admin creates; admin + super_admin can view — upcoming meetings / info for admins)
router.get("/meeting-notes", asyncHandler(meetingNoteController.list));
router.get("/meeting-notes/:id", asyncHandler(meetingNoteController.getById));
router.post(
  "/meeting-notes",
  superAdminAuth,
  optionalSingleMeetingNote("image"),
  asyncHandler(meetingNoteController.create)
);
router.patch(
  "/meeting-notes/:id",
  superAdminAuth,
  optionalSingleMeetingNote("image"),
  asyncHandler(meetingNoteController.update)
);
router.delete("/meeting-notes/:id", superAdminAuth, asyncHandler(meetingNoteController.remove));

// Calendar notes (separate from meeting notes; admin + super_admin can manage)
router.get("/calendar-notes", asyncHandler(calendarNoteController.list));
router.get("/calendar-notes/:date", asyncHandler(calendarNoteController.getByDate));
router.post("/calendar-notes", asyncHandler(calendarNoteController.createOrUpdate));
router.delete("/calendar-notes/:date", asyncHandler(calendarNoteController.remove));

// Permission requests (admin creates; super_admin approves/rejects)
router.get("/permission-requests", asyncHandler(permissionRequestController.list));
router.get("/permission-requests/:id", asyncHandler(permissionRequestController.getById));
router.post("/permission-requests", asyncHandler(permissionRequestController.create));
router.patch(
  "/permission-requests/:id",
  superAdminAuth,
  asyncHandler(permissionRequestController.approveReject)
);

// Notifications (for assigned staff and work done)
router.get("/notifications", asyncHandler(notificationController.listNotifications));
router.get("/notifications/unread-count", asyncHandler(notificationController.getUnreadCount));
router.patch("/notifications/:id/read", asyncHandler(notificationController.markAsRead));
router.patch("/notifications/read-all", asyncHandler(notificationController.markAllAsRead));
router.delete("/notifications/:id", asyncHandler(notificationController.deleteNotification));
router.delete("/notifications/by-ticket/:ticketId", superAdminAuth, asyncHandler(notificationController.deleteNotificationsByTicket));

module.exports = router;
