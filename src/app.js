const express = require("express");
const path = require("node:path");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const ticketsRouter = require("./routes/tickets");
const categoriesRouter = require("./routes/categories");
const adminRouter = require("./routes/admin");
const authRouter = require("./routes/auth");
const alertsRouter = require("./routes/alerts");
const teamAlertsRouter = require("./routes/teamAlerts");
const workLogRoutes = require("./routes/workLogRoutes");
const { errorHandler } = require("./middleware/errorHandler");

function createApp() {
  const app = express();

  // security & utils
  app.use(helmet());
  app.use(cors());
  app.use(morgan("dev"));

  // JSON body (non-multipart)
  // NOTE: multipart/form-data is handled by multer in routes, not by express.json()
  // 20mb for calendar notes with base64 images + PDFs (base64 ~4/3 of file size; 413 = increase limit & restart server)
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
  
  // root
  app.get("/", (req, res) => {
    res.json({
      name: "OCM Report System API",
      project: "OCM Report Management System (backend)",
      status: "ok",
      version: "1.0.0",
      legacyFrom: "e-ticket codebase — /api/tickets and related tables remain until report APIs replace them",
      endpoints: {
        health: "GET /health",

        // AUTH — single login for user, admin, super_admin
        register: "POST /api/auth/register (body.role: user | admin | super_admin)",
        login: "POST /api/auth/login (user, admin, super_admin — try user then admin)",
        forgotPassword: "POST /api/auth/forgot-password",
        resetPassword: "POST /api/auth/reset-password",

        // Legacy ticket module (from e-ticket; paths unchanged for compatibility)
        createTicket: "POST /api/tickets (Bearer user token; multipart images[] OR JSON imageUrl)",
        listTickets: "GET /api/tickets?status=open&page=1&limit=10",
        checkTicket: "GET /api/tickets/check?code=TCK-XXXXXX",
        updateTicket: "PUT /api/tickets/:id (multipart: images[]; appendImages=true|false)",
        categories: "GET /api/categories (active categories for legacy ticket form)",

        // ADMIN (all require Bearer token; login via POST /api/auth/login)
        adminMe: "GET /api/admin/me",
        adminListTickets: "GET /api/admin/tickets",
        adminUpdateTicket:
          "PATCH /api/admin/tickets/:id (admin: status, adminComment, optional solution image file, clearSolution)",
        alertsPublic: "GET /api/alerts (list alerts, no auth)",
        adminAlerts: "GET /api/admin/alerts, GET /api/admin/alerts/:id, POST /api/admin/alerts, PATCH /api/admin/alerts/:id, DELETE /api/admin/alerts/:id (admin only)",
        teamAlertsPublic: "GET /api/team-alerts (list team alerts, no auth)",
        adminTeamAlerts: "GET/POST/PATCH/DELETE /api/admin/team-alerts, /api/admin/team-alerts/:id (super_admin only)",
        meetingNotes:
          "GET /api/admin/meeting-notes, GET /api/admin/meeting-notes/:id (admin + super_admin); POST/PATCH/DELETE /api/admin/meeting-notes (super_admin only: date, note, image)",
        calendarNotes:
          "GET /api/admin/calendar-notes, GET /api/admin/calendar-notes/:date (admin + super_admin); POST /api/admin/calendar-notes (upsert by date: date, note, images[]); DELETE /api/admin/calendar-notes/:date",
        permissionRequests:
          "GET /api/admin/permission-requests (admin: own list; super_admin: all), GET /api/admin/permission-requests/:id, POST /api/admin/permission-requests (admin only), PATCH /api/admin/permission-requests/:id (super_admin only: approve/reject)",
      },
      roles: ["user", "admin", "super_admin"],
      statuses: ["open", "in_progress", "done"],

      // Which route is public, admin, or super_admin
      routesByAccess: {
        public: [
          "GET /",
          "GET /health",
          "POST /api/auth/register",
          "POST /api/auth/login",
          "POST /api/auth/forgot-password",
          "POST /api/auth/reset-password",
          "POST /api/tickets",
          "GET /api/tickets",
          "GET /api/tickets/check",
          "PUT /api/tickets/:id",
          "GET /api/categories",
          "GET /api/alerts",
          "GET /api/team-alerts",
        ],
        admin: [
          "GET /api/admin/me",
          "GET /api/admin/tickets",
          "GET /api/admin/tickets/:id",
          "PATCH /api/admin/tickets/:id",
          "GET /api/admin/alerts",
          "GET /api/admin/alerts/:id",
          "POST /api/admin/alerts",
          "PATCH /api/admin/alerts/:id",
          "DELETE /api/admin/alerts/:id",
          "GET /api/admin/meeting-notes",
          "GET /api/admin/meeting-notes/:id",
          "GET /api/admin/calendar-notes",
          "GET /api/admin/calendar-notes/:date",
          "POST /api/admin/calendar-notes",
          "DELETE /api/admin/calendar-notes/:date",
          "GET /api/admin/permission-requests",
          "GET /api/admin/permission-requests/:id",
          "POST /api/admin/permission-requests",
        ],
        super_admin: [
          "GET /api/admin/team-alerts",
          "GET /api/admin/team-alerts/:id",
          "POST /api/admin/team-alerts",
          "PATCH /api/admin/team-alerts/:id",
          "DELETE /api/admin/team-alerts/:id",
          "POST /api/admin/meeting-notes",
          "PATCH /api/admin/meeting-notes/:id",
          "DELETE /api/admin/meeting-notes/:id",
          "GET /api/admin/permission-requests",
          "GET /api/admin/permission-requests/:id",
          "PATCH /api/admin/permission-requests/:id",
        ],
      },

      notes: {
        roles:
          "user (legacy tickets), admin (legacy tickets + alerts + meeting-notes view + permission-requests), super_admin (legacy tickets + alerts + team-alerts + meeting-notes CRUD + permission-request approve/reject)",
        permissionRequestStatuses:
          "late (arrivalTime+reason), leave_early (leaveTime+reason), absent (fromDate+toDate+totalDays+reason), out_of_office (startTime+endTime+location+reason)",
        multiImageField: "Use form-data key `images` to upload multiple files",
        imageMode:
          "If you send images without appendImages=true, it replaces. With appendImages=true, it appends.",
        adminOnly:
          "Only admin can edit status, adminComment, solution image (public update blocks them). Solution is optional image (form field 'solution'); use clearSolution=true to remove.",
      },
    });
  });

  // health check
  app.get("/health", (req, res) => {
    res.json({ ok: true });
  });

  // routes
  app.use("/api/auth", authRouter);
  app.use("/api/tickets", ticketsRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/alerts", alertsRouter);
  app.use("/api/team-alerts", teamAlertsRouter);
  app.use("/api/work-logs", workLogRoutes);
  app.use("/api/admin", adminRouter);

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
