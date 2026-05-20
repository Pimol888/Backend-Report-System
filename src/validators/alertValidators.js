function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function validateCreateAlert(body) {
  const title = body?.title;
  if (!isNonEmptyString(title)) {
    return { ok: false, error: "title is required" };
  }
  return {
    ok: true,
    value: {
      title: String(title).trim(),
      message: String(body?.message ?? "").trim(),
    },
  };
}

function validateUpdateAlert(body) {
  const value = {};
  if (body?.title !== undefined) value.title = String(body.title).trim();
  if (body?.message !== undefined) value.message = String(body.message).trim();
  if (Object.keys(value).length === 0) {
    return { ok: false, error: "Provide at least one of title or message to update" };
  }
  return { ok: true, value };
}

module.exports = { validateCreateAlert, validateUpdateAlert };
