const TICKET_STATUSES = ["open", "in_progress", "done"];
const STATUS_SET = new Set(TICKET_STATUSES);

function assertValidStatus(status) {
  if (!STATUS_SET.has(status)) throw new Error("Invalid ticket status");
}

/** Sequential ticket code: DDTO-01, DDTO-02, DDTO-03, ... */
function generateTicketCode(ticketId) {
  const num = Number(ticketId);
  const n = Number.isFinite(num) && num > 0 ? num : 1;
  return `DDTO-${String(n).padStart(2, "0")}`;
}

function buildImageObjects(files) {
  if (!files || files.length === 0) return [];
  return files.map((file) => ({
    filename: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    url: `/uploads/tickets/${file.filename}`,
  }));
}

/** Single file -> solution image object (for admin solution upload) */
function buildSolutionImageObject(file) {
  if (!file) return null;
  const arr = buildImageObjects([file]);
  return arr.length ? arr[0] : null;
}

/** Build image entries from URL(s) when sending JSON (imageUrl / imageUrls) */
function buildImageObjectsFromUrls(imageUrl, imageUrls) {
  const list = [];
  if (typeof imageUrl === "string" && imageUrl.trim().length > 0) {
    list.push({ url: imageUrl.trim() });
  }
  if (Array.isArray(imageUrls)) {
    imageUrls.forEach((u) => {
      if (typeof u === "string" && u.trim().length > 0) list.push({ url: u.trim() });
    });
  }
  return list;
}

function createTicket(data, id, files) {
  const now = new Date().toISOString();

  // title is optional
  const title = String(data.title ?? data.problem ?? "").trim();

  // Multi-category support:
  // - preferred: data.categoryItems = [{ category, problem }]
  // - fallback: data.ticketCategories + data.categoryProblems
  // - legacy: data.ticketCategory (+ optional data.ticketCategoryOther)
  const categoryItems =
    Array.isArray(data.categoryItems) && data.categoryItems.length > 0
      ? data.categoryItems
      : Array.isArray(data.ticketCategories) && Array.isArray(data.categoryProblems)
        ? data.ticketCategories.map((c, i) => ({
            category: String(c ?? "").trim(),
            problem: String(data.categoryProblems[i] ?? "").trim(),
          }))
        : [
            {
              category: String(data.ticketCategory ?? "").trim(),
              problem: String(data.ticketCategoryOther ?? "").trim(),
            },
          ];

  return {
    id,
    ticketCode: generateTicketCode(id),

    name: String(data.name).trim(),
    courtesyName: String(data.courtesyName ?? data.courtesy_name ?? "").trim(),
    position: String(data.position).trim(),
    department: String(data.department).trim(),
    phoneNumber: String(data.phoneNumber).trim(),

    title,
    description: String(data.description).trim(),
    roomNumber: String(data.roomNumber ?? "").trim(),
    ticketCategory: String(data.ticketCategory ?? "").trim(),
    ticketCategoryOther: String(data.ticketCategoryOther ?? "").trim(),
    categoryItems,

    status: "open",
    solution: null,

    // ✅ admin-only note/comment
    adminComment: null,

    // ✅ assigned staff (max 3, super_admin only) — [{ id, name }]
    assignedStaff: [],

    // ✅ closedBy: set when ticket is closed (status → done); { id, name } = admin who closed
    closedBy: null,

    // ✅ multiple images: from uploaded files and/or from imageUrl(s) in JSON
    images: [
      ...buildImageObjects(files),
      ...buildImageObjectsFromUrls(data.imageUrl, data.imageUrls),
    ],

    createdAt: now,
    updatedAt: now,
  };
}

module.exports = {
  TICKET_STATUSES,
  assertValidStatus,
  createTicket,
  buildImageObjects,
  buildImageObjectsFromUrls,
  buildSolutionImageObject,
};
