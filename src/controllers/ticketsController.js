const { HttpError } = require("../utils/httpError");
const { config } = require("../config/env");
const { validateCreateTicket, validateUpdateTicket } = require("../validators/ticketValidators");
const {
  createTicketService,
  listTicketsService,
  getTicketByCodeService,
  updateTicketService,
} = require("../services/ticketService");
const { getDb } = require("../db");
const { createNotification } = require("../models/notification");

function ok(res, message, data, status = 200, extra = {}) {
  return res.status(status).json({ success: true, message, data, ...extra });
}

async function createTicket(req, res) {
  const body = { ...req.body };
  if (typeof body.categoryItems === "string") {
    try {
      body.categoryItems = JSON.parse(body.categoryItems);
    } catch {
      body.categoryItems = undefined;
    }
  }
  const validation = validateCreateTicket(body);
  if (!validation.ok) {
    throw new HttpError(400, "Please fill all required fields", { errors: validation.errors });
  }

  // ===============================
  // CAPTCHA (Cloudflare Turnstile)
  // ===============================
  const captchaToken = body.captchaToken || body["captchaToken"] || "";
  if (!captchaToken) {
    throw new HttpError(400, "CAPTCHA token is required");
  }

  if (!config.turnstileSecretKey) {
    throw new HttpError(500, "CAPTCHA secret key not configured on server");
  }

  try {
    const params = new URLSearchParams();
    params.append("secret", config.turnstileSecretKey);
    params.append("response", captchaToken);
    // Optional: include IP if available (Express req.ip)
    if (req.ip) {
      params.append("remoteip", req.ip);
    }

    const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: params,
    });
    const verifyJson = await verifyRes.json();
    if (!verifyJson.success) {
      throw new HttpError(400, "CAPTCHA validation failed", { errors: verifyJson["error-codes"] });
    }
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(502, "Failed to verify CAPTCHA");
  }

  // ✅ multiple files: req.files (array)
  const ticket = await createTicketService(validation.value, req.files || []);
  const io = req.app.get("io");
  if (io) {
    io.emit("ticket:created", { ticket });
    // Create notifications for super admins when a new ticket arrives
    const db = await getDb();
    const superAdmins = (db.admins || []).filter((a) => a.role === "super_admin");
    for (const sa of superAdmins) {
      const notif = await createNotification({
        adminId: sa.id,
        ticketId: ticket.id,
        message: `សំណើថ្មី #${ticket.ticketCode || ticket.id}`,
        type: "new_ticket",
      });
      io.to(`admin:${notif.adminId}`).emit("notification:new", { notification: notif });
    }
  }
  return ok(res, "Ticket created successfully", { ticket }, 201);
}

async function listTickets(req, res) {
  const { tickets, meta } = await listTicketsService(req.query);
  return ok(res, "Tickets fetched successfully", { tickets }, 200, { meta });
}

async function checkTicket(req, res) {
  const { code } = req.query;
  if (!code) throw new HttpError(400, "ticketCode is required");

  const ticket = await getTicketByCodeService(code);
  if (!ticket) throw new HttpError(404, "Ticket not found");

  return ok(res, "Ticket fetched successfully", { ticket });
}

async function updateTicket(req, res) {
  const validation = validateUpdateTicket(req.body);
  if (!validation.ok) {
    throw new HttpError(400, "Invalid update payload", { errors: validation.errors });
  }

  const ticket = await updateTicketService(
    req.params.id,
    validation.value,
    req.files || [],
    { isAdmin: false }
  );

  return ok(res, "Ticket updated successfully", { ticket });
}

module.exports = {
  createTicket,
  listTickets,
  checkTicket,
  updateTicket,
};
