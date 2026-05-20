const { getDb, updateDb } = require("../db");
const {
  createTicket,
  assertValidStatus,
  buildImageObjects,
  buildImageObjectsFromUrls,
  buildSolutionImageObject,
} = require("../models/ticket");
const { HttpError } = require("../utils/httpError");

function normalizeAssignedStaff(ticket) {
  if (!ticket) return ticket;
  if (!Array.isArray(ticket.assignedStaff)) ticket.assignedStaff = [];
  // Only nullify closedBy if it's not a valid object with id and name
  if (ticket.closedBy != null) {
    if (typeof ticket.closedBy !== "object" || ticket.closedBy.id == null || ticket.closedBy.name == null) {
      ticket.closedBy = null;
    }
  }
  return ticket;
}

async function createTicketService(payload, files) {
  let ticket;

  await updateDb(async (db) => {
    if (!Array.isArray(db.tickets)) db.tickets = [];
    if (typeof db.lastTicketId !== "number") db.lastTicketId = 0;

    const nextId = db.lastTicketId + 1;
    db.lastTicketId = nextId;

    ticket = createTicket(payload, nextId, files);
    db.tickets.push(ticket);
  });

  return ticket;
}

async function listTicketsService({ status, page = "1", limit = "10" }) {
  const db = await getDb();
  let tickets = Array.isArray(db.tickets) ? [...db.tickets] : [];

  if (status) tickets = tickets.filter((t) => t.status === status);

  // pagination
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 10));
  const total = tickets.length;
  const totalPages = Math.max(1, Math.ceil(total / limitNum));
  const start = (pageNum - 1) * limitNum;
  const paged = tickets.slice(start, start + limitNum).map(normalizeAssignedStaff);

  return {
    tickets: paged,
    meta: { page: pageNum, limit: limitNum, total, totalPages },
  };
}

async function getTicketByCodeService(ticketCode) {
  const db = await getDb();
  const tickets = Array.isArray(db.tickets) ? db.tickets : [];
  return tickets.find((t) => t.ticketCode === ticketCode) || null;
}

async function getTicketByIdService(id) {
  const db = await getDb();
  const tickets = Array.isArray(db.tickets) ? db.tickets : [];
  const numId = Number(id);
  if (!Number.isFinite(numId)) return null;
  const ticket = tickets.find((t) => t.id === numId) || null;
  return normalizeAssignedStaff(ticket);
}

/**
 * Admin-only fields: status, adminComment, solution, assignedStaff (super_admin only)
 * User fields: title, description, roomNumber, images
 *
 * images behavior:
 * - if files provided:
 *    - if payload.appendImages=true -> append
 *    - else -> replace all images
 */
async function updateTicketService(id, payload, files, { isAdmin = false, solutionFile = null, allowAssignedStaff = false, excludeWorkDoneForAdminId = null, closedByAdmin = null } = {}) {
  let newlyAssignedForNotifications = [];
  let notifySuperAdmins = [];
  let ticketClosedForWorkLog = null;
  const result = await updateDb(async (db) => {
    const ticket = (db.tickets || []).find((t) => t.id === Number(id));
    if (!ticket) return { ok: false };

    // Ensure assignedStaff exists on legacy tickets
    if (!Array.isArray(ticket.assignedStaff)) ticket.assignedStaff = [];

    // ✅ ASSIGNED STAFF (super_admin only)
    if (payload.assignedStaff !== undefined) {
      if (!allowAssignedStaff) throw new HttpError(403, "Only super_admin can update assigned staff");
      if (!Array.isArray(payload.assignedStaff) || payload.assignedStaff.length > 3) {
        throw new HttpError(400, "assignedStaff must be an array with at most 3 items");
      }
      const oldAssignedIds = new Set((ticket.assignedStaff || []).map((s) => String(s.id)));
      const newAssigned = payload.assignedStaff.map((it) => ({
        id: typeof it.id === "number" ? it.id : String(it.id),
        name: String(it.name).trim(),
      }));
      ticket.assignedStaff = newAssigned;
      // When staff is assigned, set status to in_progress if currently open
      if (newAssigned.length > 0 && ticket.status === "open") {
        ticket.status = "in_progress";
      }

      // Store newly assigned IDs for notification creation after DB update
      newlyAssignedForNotifications = newAssigned
        .filter((s) => !oldAssignedIds.has(String(s.id)))
        .map((s) => ({ id: s.id, ticketCode: ticket.ticketCode || ticket.id, ticketId: ticket.id }));
    }

    // ✅ ADMIN-ONLY
    if (payload.status !== undefined) {
      if (!isAdmin) throw new HttpError(403, "Only admin can update status");
      assertValidStatus(payload.status);
      const oldStatus = ticket.status;
      ticket.status = payload.status;
      // Set closedBy to the admin who closed the ticket; capture for work log creation
      if (payload.status === "done" && oldStatus !== "done" && closedByAdmin && closedByAdmin.id != null && closedByAdmin.name != null) {
        ticket.closedBy = {
          id: typeof closedByAdmin.id === "number" ? closedByAdmin.id : String(closedByAdmin.id),
          name: String(closedByAdmin.name).trim(),
        };
        ticketClosedForWorkLog = {
          adminId: String(closedByAdmin.id),
          ticketId: ticket.id,
          ticketCode: ticket.ticketCode || ticket.id,
          ticketTitle: (ticket.title || "").trim(),
          ticketDescription: (ticket.description || "").trim(),
        };
      }
      // Notify super_admin when ticket is marked as done (exclude the one who closed it)
      if (payload.status === "done" && oldStatus !== "done") {
        const excludeId = excludeWorkDoneForAdminId != null ? String(excludeWorkDoneForAdminId) : null;
        const superAdmins = (db.admins || [])
          .filter((a) => a.role === "super_admin" && (excludeId == null || String(a.id) !== excludeId));
        if (superAdmins.length > 0) {
          notifySuperAdmins = superAdmins.map((sa) => ({
            id: sa.id,
            ticketCode: ticket.ticketCode || ticket.id,
            ticketId: ticket.id,
          }));
        }
      }
    }

    if (payload.adminComment !== undefined) {
      if (!isAdmin) throw new HttpError(403, "Only admin can add/edit admin comment");
      ticket.adminComment =
        payload.adminComment === null ? null : String(payload.adminComment).trim();
    }

    // Solution: optional image (from solutionFile) or clear via clearSolution (admin only)
    if (payload.clearSolution === true) {
      if (!isAdmin) throw new HttpError(403, "Only admin can clear solution");
      ticket.solution = null;
    }
    if (solutionFile) {
      if (!isAdmin) throw new HttpError(403, "Only admin can set solution image");
      const solutionImage = buildSolutionImageObject(solutionFile);
      if (solutionImage) ticket.solution = solutionImage;
    }

    // ✅ USER-ALLOWED
    if (payload.title !== undefined) ticket.title = String(payload.title).trim();
    if (payload.description !== undefined) ticket.description = String(payload.description).trim();
    if (payload.roomNumber !== undefined) ticket.roomNumber = String(payload.roomNumber).trim();
    if (payload.ticketCategory !== undefined) ticket.ticketCategory = String(payload.ticketCategory).trim();
    if (payload.ticketCategoryOther !== undefined) ticket.ticketCategoryOther = String(payload.ticketCategoryOther).trim();
    if (payload.categoryItems !== undefined) {
      if (!Array.isArray(payload.categoryItems)) {
        throw new HttpError(400, "categoryItems must be an array");
      }
      ticket.categoryItems = payload.categoryItems.map((it) => ({
        category: String(it?.category ?? "").trim(),
        problem: String(it?.problem ?? "").trim(),
      }));

      // keep legacy fields aligned with first category for older clients
      const first = ticket.categoryItems[0] || { category: "", problem: "" };
      ticket.ticketCategory = first.category;
      ticket.ticketCategoryOther = first.category.trim().toLowerCase() === "other" ? first.problem : "";
    }

    // ✅ IMAGES (multi): from uploaded files and/or from imageUrl(s) in JSON
    const fileImages = buildImageObjects(files);
    const urlImages = buildImageObjectsFromUrls(payload.imageUrl, payload.imageUrls);
    const incoming = [...fileImages, ...urlImages];

    if (incoming.length > 0) {
      const append = payload.appendImages === true || payload.appendImages === "true";
      if (append) {
        const current = Array.isArray(ticket.images) ? ticket.images : [];
        ticket.images = [...current, ...incoming];
      } else {
        ticket.images = incoming; // replace
      }
    }

    ticket.updatedAt = new Date().toISOString();
    return { ok: true, ticket };
  });

  if (!result.ok) throw new HttpError(404, "Ticket not found");

  // Create a work log card for the admin who closed the ticket (shows in AdminWorkLogView)
  if (ticketClosedForWorkLog) {
    try {
      const workLogService = require("./workLogService");
      const workDate = new Date().toISOString().slice(0, 10);
      await workLogService.createForAdmin(ticketClosedForWorkLog.adminId, {
        title: `Ticket closed: #${ticketClosedForWorkLog.ticketCode}`,
        description: ticketClosedForWorkLog.ticketDescription || ticketClosedForWorkLog.ticketTitle || "Closed a ticket",
        workDate,
        ticketId: ticketClosedForWorkLog.ticketId,
      });
    } catch (err) {
      // Don't fail the ticket update if work log creation fails
    }
  }

  const createdAssignmentNotifications = [];

  // Create notifications for newly assigned admins (after DB update)
  if (newlyAssignedForNotifications.length > 0) {
    const { createNotification } = require("../models/notification");
    for (const item of newlyAssignedForNotifications) {
      const notif = await createNotification({
        adminId: item.id,
        ticketId: item.ticketId,
        message: `អ្នកត្រូវបានកំណត់ឱ្យដោះស្រាយ #${item.ticketCode}`,
        type: "assigned",
      });
      createdAssignmentNotifications.push(notif);
    }
  }

  const createdWorkDoneNotifications = [];
  // Create notifications for super_admin when work is done (ticket closed)
  if (notifySuperAdmins.length > 0) {
    const { createNotification } = require("../models/notification");
    for (const item of notifySuperAdmins) {
      const notif = await createNotification({
        adminId: item.id,
        ticketId: item.ticketId,
        message: `ការងារត្រូវបានបញ្ចប់#${item.ticketCode}`,
        type: "work_done",
      });
      createdWorkDoneNotifications.push(notif);
    }
  }

  return {
    ticket: result.ticket,
    createdAssignmentNotifications,
    createdWorkDoneNotifications,
  };
}

module.exports = {
  createTicketService,
  listTicketsService,
  getTicketByCodeService,
  getTicketByIdService,
  updateTicketService,
};
