const express = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const reportController = require("../controllers/report.controller");
const { authenticate, requireRoles } = require("../middleware/auth.middleware");
const { uploadRequiredReportFiles } = require("../middleware/upload.middleware");

const router = express.Router();

router.use(authenticate);

router.get("/", asyncHandler(reportController.list));
router.get("/stats/cycles", asyncHandler(reportController.stats));
router.get("/:reportId", asyncHandler(reportController.detail));
router.post("/", uploadRequiredReportFiles, asyncHandler(reportController.create));
router.patch("/:reportId/status", requireRoles(["admin", "superadmin"]), asyncHandler(reportController.updateStatus));
router.post("/:reportId/notes", requireRoles(["admin", "superadmin"]), asyncHandler(reportController.addNote));
router.post(
  "/:reportId/resubmit-files",
  requireRoles(["user"]),
  uploadRequiredReportFiles,
  asyncHandler(reportController.resubmit),
);
router.get("/:reportId/files/:fileId", asyncHandler(reportController.downloadFile));

module.exports = router;
