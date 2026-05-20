function pad2(n) {
  return String(n).padStart(2, "0");
}

function getAppTimeZone() {
  return (process.env.APP_TIMEZONE || "Asia/Phnom_Penh").trim();
}

/**
 * Format a Date into parts in a specific IANA timezone.
 * Uses Intl so output is stable even if server timezone differs.
 */
function getZonedParts(date, timeZone) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return null;
  const tz = timeZone || getAppTimeZone();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const byType = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    year: byType.year,
    month: byType.month,
    day: byType.day,
    hour: byType.hour,
    minute: byType.minute,
    second: byType.second,
    timeZone: tz,
  };
}

/** DATETIME string for MySQL (YYYY-MM-DD HH:MM:SS) in APP_TIMEZONE. */
function formatLocalDateTime(value = new Date()) {
  const parts = getZonedParts(value, getAppTimeZone());
  if (!parts) return "";
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

/** DATE string (YYYY-MM-DD) in APP_TIMEZONE. */
function formatLocalDate(value = new Date()) {
  const parts = getZonedParts(value, getAppTimeZone());
  if (!parts) return "";
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function nowLocalDateTime() {
  return formatLocalDateTime(new Date());
}

function addHoursLocalDateTime(hours) {
  const h = Number(hours);
  const base = new Date();
  base.setTime(base.getTime() + (Number.isFinite(h) ? h : 0) * 60 * 60 * 1000);
  return formatLocalDateTime(base);
}

module.exports = {
  pad2,
  getAppTimeZone,
  formatLocalDateTime,
  formatLocalDate,
  nowLocalDateTime,
  addHoursLocalDateTime,
};
