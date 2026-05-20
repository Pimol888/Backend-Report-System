const express = require("express");
const { adminAuth } = require("../middleware/adminAuth");
const { superAdminAuth } = require("../middleware/superAdminAuth");
const { asyncHandler } = require("../middleware/asyncHandler");
const { optionalWorkLogPdf } = require("../middleware/upload");
const workLogController = require("../controllers/workLogController");

const router = express.Router();

router.use(adminAuth);

// ——— Admin & Super Admin ———
router.post("/", optionalWorkLogPdf("attachment"), asyncHandler(workLogController.create));
router.get("/my", asyncHandler(workLogController.listMy));
router.put("/:id", optionalWorkLogPdf("attachment"), asyncHandler(workLogController.update));
router.delete("/:id", asyncHandler(workLogController.remove));

// Export (admin: own; super_admin: optional ?adminId=)
router.get("/export", asyncHandler(workLogController.exportReport));

// Admins list for dropdown (admin + super_admin; used by super_admin for selector/follow)
router.get("/admins", asyncHandler(workLogController.listAdminsForDropdown));

// ——— Super Admin only ———
router.get("/all", superAdminAuth, asyncHandler(workLogController.listAll));
router.get("/admin/:adminId", superAdminAuth, asyncHandler(workLogController.listByAdminId));
router.post("/follow", superAdminAuth, asyncHandler(workLogController.follow));
router.delete("/unfollow/:adminId", superAdminAuth, asyncHandler(workLogController.unfollow));
router.get("/followed-feed", superAdminAuth, asyncHandler(workLogController.followedFeed));
router.get("/followed-admins", superAdminAuth, asyncHandler(workLogController.listFollowedAdmins));

// Single log (for edit modal etc.)
router.get("/:id", asyncHandler(workLogController.getById));

module.exports = router;
