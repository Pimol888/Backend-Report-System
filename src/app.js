const express = require("express");
const path = require("node:path");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const apiRouter = require("./routes");
const { errorHandler } = require("./middleware/errorHandler");

function createApp() {
  const app = express();

  // security & utils
  app.use(helmet());
  app.use(cors());
  app.use(morgan("dev"));

  app.use(express.json({ limit: "100mb" }));

  // API responses: never cache so clients always get latest data when they request
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    next();
  });

  // static uploads (serve files saved by multer)
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
  
  app.get("/", (req, res) => {
    res.json({
      name: "OCM Report System API",
      status: "ok",
      version: "1.0.0",
      project: "OCM Report Management System backend",
      endpoints: {
        health: "GET /health",
        login: "POST /api/auth/login",
        me: "GET /api/auth/me",
        reportsList: "GET /api/reports",
        reportsStats: "GET /api/reports/stats/cycles",
        reportDetail: "GET /api/reports/:reportId",
        reportCreate: "POST /api/reports (multipart: pdf + word)",
        reportStatus: "PATCH /api/reports/:reportId/status",
        reportNotes: "POST /api/reports/:reportId/notes",
        reportResubmit: "POST /api/reports/:reportId/resubmit-files",
        reportFile: "GET /api/reports/:reportId/files/:fileId",
        teamMembers: "GET /api/team-members",
        departments: "GET /api/departments",
        generalDirectorates: "GET /api/general-directorates",
      },
      roles: ["user", "admin", "superadmin"],
      cycles: ["monthly", "quarterly", "semiannual", "yearly"],
      statuses: ["pending", "reviewed"],
      socket: {
        path: "/socket.io",
        auth: { token: "<jwt-from-/api/auth/login>" },
        events: [
          "report:created",
          "report:updated",
          "report:status-changed",
          "report:note-added",
          "report:resubmitted",
        ],
      },
    });
  });

  // health check
  app.get("/health", (req, res) => {
    res.json({ ok: true });
  });

  app.use("/api", apiRouter);

  // 404 (unknown route)
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: "Route not found",
      path: req.originalUrl,
      method: req.method,
    });
  });

  // error handler (ALWAYS LAST)
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
