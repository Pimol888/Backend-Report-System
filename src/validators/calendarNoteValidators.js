function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

/** Validate YYYY-MM-DD */
function isValidDateStr(v) {
  if (typeof v !== "string" || !v.trim()) return false;
  const trimmed = v.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return false;
  const [, y, m, d] = match;
  const year = parseInt(y, 10);
  const month = parseInt(m, 10);
  const day = parseInt(d, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function validateUpsertCalendarNote(body) {
  const date = body?.date;
  if (!isValidDateStr(date)) {
    return { ok: false, error: "date is required and must be YYYY-MM-DD" };
  }
  const note = body?.note;
  const images = Array.isArray(body?.images)
    ? body.images.filter((x) => typeof x === "string" && x.trim().length > 0)
    : [];
  return {
    ok: true,
    value: {
      date: String(date).trim(),
      note: typeof note === "string" ? note.trim() : "",
      images,
    },
  };
}

module.exports = { validateUpsertCalendarNote };
