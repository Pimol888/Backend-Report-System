/**
 * Validators for work log payloads. Returns { ok: true, value } or { ok: false, error: string }.
 */
function validateCreateWorkLog(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body is required" };
  }
  const title = body.title != null ? String(body.title).trim() : "";
  const description = body.description != null ? String(body.description) : "";
  const workDate = body.workDate != null ? String(body.workDate).trim() : "";
  if (!title) return { ok: false, error: "Title is required" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) {
    return { ok: false, error: "workDate must be YYYY-MM-DD" };
  }
  return {
    ok: true,
    value: { title, description, workDate },
  };
}

function validateUpdateWorkLog(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body is required" };
  }
  const title = body.title !== undefined ? String(body.title).trim() : undefined;
  const description = body.description !== undefined ? String(body.description) : undefined;
  const workDate = body.workDate !== undefined ? String(body.workDate).trim() : undefined;
  const clearAttachment = body.clearAttachment === true || body.clearAttachment === "true";
  if (workDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(workDate)) {
    return { ok: false, error: "workDate must be YYYY-MM-DD" };
  }
  return {
    ok: true,
    value: { title, description, workDate, clearAttachment: clearAttachment || undefined },
  };
}

function validateFollowBody(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body is required" };
  }
  const adminId = body.adminId != null ? String(body.adminId).trim() : "";
  if (!adminId) return { ok: false, error: "adminId is required" };
  return { ok: true, value: { adminId } };
}

module.exports = {
  validateCreateWorkLog,
  validateUpdateWorkLog,
  validateFollowBody,
};
