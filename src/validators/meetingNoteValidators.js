function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function validateCreateMeetingNote(body) {
  const date = body?.date;
  if (!isNonEmptyString(date)) {
    return { ok: false, error: "date is required" };
  }
  return {
    ok: true,
    value: {
      date: String(date).trim(),
      note: String(body?.note ?? "").trim(),
      imageUrl: typeof body?.imageUrl === "string" ? body.imageUrl.trim() : undefined,
    },
  };
}

function validateUpdateMeetingNote(body) {
  const value = {};
  if (body?.date !== undefined) value.date = String(body.date).trim();
  if (body?.note !== undefined) value.note = String(body.note).trim();
  if (body?.clearImage !== undefined) value.clearImage = body.clearImage === true;
  if (typeof body?.imageUrl === "string") value.imageUrl = body.imageUrl.trim();
  if (Object.keys(value).length === 0) {
    return { ok: false, error: "Provide at least one of date, note, imageUrl, or clearImage to update" };
  }
  return { ok: true, value };
}

module.exports = { validateCreateMeetingNote, validateUpdateMeetingNote };
