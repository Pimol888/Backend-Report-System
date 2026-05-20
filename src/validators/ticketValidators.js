const { TICKET_STATUSES } = require("../models/ticket");
const { toLatinDigits } = require("../utils/numerals");

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function optionalString(v) {
  if (v === undefined) return undefined;
  if (v === null) return null;
  return String(v);
}

function normalizeCategoryItemsFromBody(body, errors) {
  // Option A: categoryItems = [{ category, problem }]
  if (Array.isArray(body.categoryItems)) {
    const items = body.categoryItems
      .map((it) => ({
        category: String(it?.category ?? "").trim(),
        problem: String(it?.problem ?? "").trim(),
      }))
      .filter((it) => it.category.length > 0);

    if (items.length === 0) {
      errors.categoryItems = "categoryItems must include at least 1 item";
      return null;
    }
    const bad = items.find((it) => it.problem.length === 0);
    if (bad) {
      errors.categoryItems = "Each categoryItems item must include a non-empty problem";
      return null;
    }
    return items;
  }

  // Option B: ticketCategories + categoryProblems arrays
  if (Array.isArray(body.ticketCategories)) {
    const cats = body.ticketCategories
      .map((c) => String(c ?? "").trim())
      .filter((c) => c.length > 0);

    if (cats.length === 0) {
      errors.ticketCategories = "ticketCategories must include at least 1 category";
      return null;
    }

    if (!Array.isArray(body.categoryProblems)) {
      errors.categoryProblems = "categoryProblems must be an array (same length as ticketCategories)";
      return null;
    }

    const probs = body.categoryProblems.map((p) => String(p ?? "").trim());
    if (probs.length !== cats.length) {
      errors.categoryProblems = "categoryProblems must have the same length as ticketCategories";
      return null;
    }

    for (let i = 0; i < probs.length; i += 1) {
      if (probs[i].length === 0) {
        errors.categoryProblems = "Each categoryProblems item must be non-empty";
        return null;
      }
    }

    return cats.map((category, i) => ({ category, problem: probs[i] }));
  }

  return null;
}

function validateCreateTicket(body) {
  const errors = {};
  const value = {};

  if (!isNonEmptyString(body.name)) errors.name = "name is required";
  else value.name = body.name;

  if (!isNonEmptyString(body.position)) errors.position = "position is required";
  else value.position = body.position;

  if (!isNonEmptyString(body.department)) errors.department = "department is required";
  else value.department = body.department;

  if (!isNonEmptyString(body.phoneNumber)) errors.phoneNumber = "phoneNumber is required";
  else value.phoneNumber = toLatinDigits(body.phoneNumber).replace(/[\s-]/g, "");

  // title is optional (client does not require it)
  const title = body.title ?? body.problem ?? "";
  value.title = typeof title === "string" ? title.trim() : "";

  if (!isNonEmptyString(body.description)) errors.description = "description is required";
  else value.description = body.description;

  value.roomNumber = toLatinDigits(optionalString(body.roomNumber) ?? "");
  value.courtesyName = optionalString(body.courtesy_name ?? body.courtesyName) ?? "";
  value.ticketCategory = optionalString(body.ticketCategory) ?? "";

  // When category is "other", require the other problem description
  const categoryNorm = (value.ticketCategory || "").trim().toLowerCase();
  if (categoryNorm === "other") {
    if (!isNonEmptyString(body.ticketCategoryOther) && !isNonEmptyString(body.otherProblem)) {
      errors.ticketCategoryOther = "Please describe the problem (required when category is Other)";
    } else {
      value.ticketCategoryOther = optionalString(body.ticketCategoryOther ?? body.otherProblem) ?? "";
    }
  } else {
    value.ticketCategoryOther = "";
  }

  // Multi-category (preferred)
  const categoryItems = normalizeCategoryItemsFromBody(body, errors);
  if (categoryItems) {
    value.categoryItems = categoryItems;
    // keep legacy fields aligned with first category for older clients
    value.ticketCategory = categoryItems[0].category;
    value.ticketCategoryOther = categoryItems[0].category.trim().toLowerCase() === "other" ? categoryItems[0].problem : "";
  }

  // Optional image URL(s) when sending JSON (e.g. imageUrl or imageUrls)
  value.imageUrl = optionalString(body.imageUrl) || null;
  if (Array.isArray(body.imageUrls)) {
    value.imageUrls = body.imageUrls.filter((u) => typeof u === "string" && u.trim().length > 0).map((u) => u.trim());
  } else {
    value.imageUrls = [];
  }

  const ok = Object.keys(errors).length === 0;
  return ok ? { ok: true, value } : { ok: false, errors };
}

/**
 * Public/user update: can edit title/description/roomNumber/images
 * Must NOT allow status/adminComment/solution
 */
function validateUpdateTicket(body) {
  const errors = {};
  const value = {};

  if (body.status !== undefined) errors.status = "status can only be updated by admin";
  if (body.adminComment !== undefined) errors.adminComment = "adminComment can only be updated by admin";
  if (body.solution !== undefined) errors.solution = "solution can only be updated by admin";

  if (body.title !== undefined) value.title = String(body.title);
  if (body.description !== undefined) value.description = String(body.description);
  if (body.roomNumber !== undefined) value.roomNumber = toLatinDigits(body.roomNumber);
  if (body.ticketCategory !== undefined) {
    value.ticketCategory = String(body.ticketCategory);
    const catNorm = value.ticketCategory.trim().toLowerCase();
    if (catNorm === "other") {
      if (body.ticketCategoryOther !== undefined) value.ticketCategoryOther = String(body.ticketCategoryOther);
      else if (body.otherProblem !== undefined) value.ticketCategoryOther = String(body.otherProblem);
      else errors.ticketCategoryOther = "Please describe the problem (required when category is Other)";
    } else {
      value.ticketCategoryOther = "";
    }
  }
  if (body.ticketCategoryOther !== undefined) value.ticketCategoryOther = String(body.ticketCategoryOther);
  if (body.otherProblem !== undefined) value.ticketCategoryOther = String(body.otherProblem);

  if (body.imageUrl !== undefined) value.imageUrl = optionalString(body.imageUrl) || null;
  if (Array.isArray(body.imageUrls)) {
    value.imageUrls = body.imageUrls.filter((u) => typeof u === "string" && u.trim().length > 0).map((u) => u.trim());
  }

  // Multi-category updates
  const categoryItems = normalizeCategoryItemsFromBody(body, errors);
  if (categoryItems) {
    value.categoryItems = categoryItems;
    value.ticketCategory = categoryItems[0].category;
    value.ticketCategoryOther = categoryItems[0].category.trim().toLowerCase() === "other" ? categoryItems[0].problem : "";
  }

  if (body.appendImages !== undefined) {
    // accept true/false/"true"/"false"
    const v = body.appendImages;
    if (v === true || v === false || v === "true" || v === "false") {
      value.appendImages = v === true || v === "true";
    } else {
      errors.appendImages = "appendImages must be true or false";
    }
  }

  const ok = Object.keys(errors).length === 0;
  return ok ? { ok: true, value } : { ok: false, errors };
}

/**
 * Admin update: allow status, adminComment, optional solution image (form field 'solution'), clearSolution (+ optionally other fields)
 */
function validateAdminUpdateTicket(body) {
  const errors = {};
  const value = {};

  if (body.status !== undefined) {
    if (!TICKET_STATUSES.includes(body.status)) {
      errors.status = `status must be one of: ${TICKET_STATUSES.join(", ")}`;
    } else {
      value.status = body.status;
    }
  }

  if (body.adminComment !== undefined) {
    if (body.adminComment === null) value.adminComment = null;
    else if (typeof body.adminComment !== "string") errors.adminComment = "adminComment must be a string or null";
    else value.adminComment = body.adminComment;
  }

  // Solution is now an optional image (solution file field), not text. Use clearSolution=true to remove.
  if (body.clearSolution !== undefined) {
    const v = body.clearSolution;
    if (v === true || v === "true" || v === 1 || v === "1") value.clearSolution = true;
    else if (v === false || v === "false" || v === 0 || v === "0") value.clearSolution = false;
    else value.clearSolution = false;
  }

  // Optional admin edits:
  if (body.title !== undefined) value.title = String(body.title);
  if (body.description !== undefined) value.description = String(body.description);
  if (body.roomNumber !== undefined) value.roomNumber = toLatinDigits(body.roomNumber);
  if (body.ticketCategory !== undefined) {
    value.ticketCategory = String(body.ticketCategory);
    const catNorm = value.ticketCategory.trim().toLowerCase();
    if (catNorm === "other") {
      if (body.ticketCategoryOther !== undefined) value.ticketCategoryOther = String(body.ticketCategoryOther);
      else if (body.otherProblem !== undefined) value.ticketCategoryOther = String(body.otherProblem);
      else errors.ticketCategoryOther = "Please describe the problem (required when category is Other)";
    } else {
      value.ticketCategoryOther = "";
    }
  }
  if (body.ticketCategoryOther !== undefined) value.ticketCategoryOther = String(body.ticketCategoryOther);
  if (body.otherProblem !== undefined) value.ticketCategoryOther = String(body.otherProblem);

  if (body.appendImages !== undefined) {
    const v = body.appendImages;
    if (v === true || v === false || v === "true" || v === "false") {
      value.appendImages = v === true || v === "true";
    } else {
      errors.appendImages = "appendImages must be true or false";
    }
  }

  // Allow admin to add image URL(s) via JSON too
  if (body.imageUrl !== undefined) value.imageUrl = optionalString(body.imageUrl) || null;
  if (Array.isArray(body.imageUrls)) {
    value.imageUrls = body.imageUrls.filter((u) => typeof u === "string" && u.trim().length > 0).map((u) => u.trim());
  }

  // Multi-category updates (admin)
  const categoryItems = normalizeCategoryItemsFromBody(body, errors);
  if (categoryItems) {
    value.categoryItems = categoryItems;
    value.ticketCategory = categoryItems[0].category;
    value.ticketCategoryOther = categoryItems[0].category.trim().toLowerCase() === "other" ? categoryItems[0].problem : "";
  }

  // Assigned staff (super_admin only): max 3, each { id: string|number (admin id), name: string (username) }
  // When sent via FormData, assignedStaff may be a JSON string
  let rawAssigned = body.assignedStaff;
  if (typeof rawAssigned === "string") {
    try {
      rawAssigned = JSON.parse(rawAssigned);
    } catch {
      rawAssigned = undefined;
    }
  }
  if (rawAssigned !== undefined) {
    if (!Array.isArray(rawAssigned)) {
      errors.assignedStaff = "assignedStaff must be an array";
    } else if (rawAssigned.length > 3) {
      errors.assignedStaff = "Maximum 3 staff allowed";
    } else {
      const invalid = rawAssigned.find(
        (item) =>
          typeof item !== "object" ||
          item === null ||
          (typeof item.id !== "string" && typeof item.id !== "number") ||
          typeof item.name !== "string"
      );
      if (invalid) {
        errors.assignedStaff = "Each assignedStaff item must be { id: string|number, name: string }";
      } else {
        value.assignedStaff = rawAssigned.map((it) => ({
          id: typeof it.id === "number" ? it.id : String(it.id),
          name: String(it.name).trim(),
        }));
      }
    }
  }

  const ok = Object.keys(errors).length === 0;
  return ok ? { ok: true, value } : { ok: false, errors };
}

module.exports = {
  validateCreateTicket,
  validateUpdateTicket,
  validateAdminUpdateTicket,
};
