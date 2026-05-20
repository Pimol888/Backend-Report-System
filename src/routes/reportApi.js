const express = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const { HttpError } = require("../utils/httpError");
const reportAuth = require("../report/auth");
const reportService = require("../report/service");
const { authenticate, requireRoles } = require("../report/authMiddleware");
const { uploadRequiredReportFiles } = require("../report/upload");

const router = express.Router();
const authRouter = express.Router();
const reportsRouter = express.Router();
const metaRouter = express.Router();

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    const result = await reportAuth.login(email, password);
    res.json({ success: true, data: result });
  }),
);

authRouter.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await reportAuth.getUserById(req.auth.id);
    if (!user) throw new HttpError(404, "User not found");
    res.json({ success: true, data: { user } });
  }),
);

reportsRouter.use(authenticate);

reportsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await reportService.listReports(req.auth, req.query || {});
    res.json({ success: true, data });
  }),
);

reportsRouter.get(
  "/stats/cycles",
  asyncHandler(async (req, res) => {
    const data = await reportService.getReportStats(req.auth);
    res.json({ success: true, data });
  }),
);

reportsRouter.get(
  "/:reportId",
  asyncHandler(async (req, res) => {
    const data = await reportService.getReportDetail(req.auth, req.params.reportId);
    res.json({ success: true, data });
  }),
);

reportsRouter.post(
  "/",
  uploadRequiredReportFiles,
  asyncHandler(async (req, res) => {
    const data = await reportService.createReport(req.auth, req.body || {}, req.files || {});
    res.status(201).json({ success: true, data });
  }),
);

reportsRouter.patch(
  "/:reportId/status",
  requireRoles(["admin", "superadmin"]),
  asyncHandler(async (req, res) => {
    const data = await reportService.updateReportStatus(req.auth, req.params.reportId, req.body?.status);
    res.json({ success: true, data });
  }),
);

reportsRouter.post(
  "/:reportId/notes",
  requireRoles(["admin", "superadmin"]),
  asyncHandler(async (req, res) => {
    const data = await reportService.addReportNote(
      req.auth,
      req.params.reportId,
      req.body?.text,
      req.body?.kind || "comment",
    );
    res.status(201).json({ success: true, data });
  }),
);

reportsRouter.post(
  "/:reportId/resubmit-files",
  requireRoles(["user"]),
  uploadRequiredReportFiles,
  asyncHandler(async (req, res) => {
    const data = await reportService.resubmitFiles(req.auth, req.params.reportId, req.files || {});
    res.json({ success: true, data });
  }),
);

reportsRouter.get(
  "/:reportId/files/:fileId",
  asyncHandler(async (req, res) => {
    const data = await reportService.getReportFile(req.auth, req.params.reportId, req.params.fileId);
    res.download(data.path, data.downloadName);
  }),
);

metaRouter.use(authenticate);

metaRouter.get(
  "/team-members",
  asyncHandler(async (req, res) => {
    const data = await reportService.getMetaData(req.auth);
    res.json({ success: true, data: data.teamMembers });
  }),
);

metaRouter.get(
  "/departments",
  asyncHandler(async (req, res) => {
    const data = await reportService.getMetaData(req.auth);
    res.json({ success: true, data: data.departments });
  }),
);

metaRouter.get(
  "/general-directorates",
  asyncHandler(async (req, res) => {
    const data = await reportService.getMetaData(req.auth);
    res.json({ success: true, data: data.generalDirectorates });
  }),
);

router.use("/auth", authRouter);
router.use("/reports", reportsRouter);
router.use("/", metaRouter);

module.exports = { reportApiRouter: router };
