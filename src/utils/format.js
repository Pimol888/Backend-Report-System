const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseSubmittedAtLabel(label) {
  const match = String(label || "").match(/^(\w{3})\s+(\d{1,2}),\s+(\d{4})\s+·\s+(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, monthStr, day, year, hour, minute] = match;
  const month = MONTHS.indexOf(monthStr);
  if (month < 0) return null;
  return new Date(Number(year), month, Number(day), Number(hour), Number(minute));
}

function formatSubmittedAtLabel(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const month = MONTHS[d.getMonth()];
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${month} ${d.getDate()}, ${d.getFullYear()} · ${hh}:${mm}`;
}

function formatKhmerNowTimeLabel(date = new Date()) {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm} ថ្ងៃនេះ`;
}

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function parseFileSummary(fileSummary) {
  const text = String(fileSummary || "");
  const lower = text.toLowerCase();
  const hasPdf = lower.includes("pdf");
  const hasWord = lower.includes("word");
  const size = text.includes("·") ? text.split("·").pop().trim() : "1.0 MB";
  return { hasPdf, hasWord, sizeLabel: size };
}

function parseSizeToBytes(sizeLabel) {
  const match = String(sizeLabel || "").trim().toUpperCase().match(/^([\d.]+)\s*(KB|MB|B)$/);
  if (!match) return 1024;
  const value = Number(match[1]);
  const unit = match[2];
  if (unit === "MB") return Math.round(value * 1024 * 1024);
  if (unit === "KB") return Math.round(value * 1024);
  return Math.round(value);
}

function toMysqlDatetime(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

module.exports = {
  formatBytes,
  formatKhmerNowTimeLabel,
  formatSubmittedAtLabel,
  parseFileSummary,
  parseSizeToBytes,
  parseSubmittedAtLabel,
  toMysqlDatetime,
};
