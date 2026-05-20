const path = require("node:path");

function parseSubmittedAtLabel(label) {
  const match = String(label || "").match(/^(\w{3})\s+(\d{1,2}),\s+(\d{4})\s+·\s+(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, monthName, day, year, hour, minute] = match;
  const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const month = months[monthName];
  if (month === undefined) return null;
  return new Date(Number(year), month, Number(day), Number(hour), Number(minute));
}

function formatSubmittedAtLabel(input) {
  const d = input instanceof Date ? input : new Date(input);
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = d.getDate();
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${month} ${day}, ${year} · ${hh}:${mm}`;
}

function formatKhmerNowTimeLabel(date = new Date()) {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm} ថ្ងៃនេះ`;
}

function parseSizeToBytes(sizeLabel) {
  const text = String(sizeLabel || "").trim().toUpperCase();
  const match = text.match(/^([\d.]+)\s*(KB|MB|B)$/);
  if (!match) return 0;
  const value = Number(match[1]);
  const unit = match[2];
  if (unit === "MB") return Math.round(value * 1024 * 1024);
  if (unit === "KB") return Math.round(value * 1024);
  return Math.round(value);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
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

function extensionByType(type) {
  return type === "word" ? ".docx" : ".pdf";
}

function sanitizeFilename(name) {
  return String(name || "").replace(/[^\w.\-()\u1780-\u17FF ]/g, "_");
}

function buildStoredFilePath(uploadDir, storedName) {
  return path.join(uploadDir, storedName);
}

module.exports = {
  buildStoredFilePath,
  extensionByType,
  formatBytes,
  formatKhmerNowTimeLabel,
  formatSubmittedAtLabel,
  parseFileSummary,
  parseSizeToBytes,
  parseSubmittedAtLabel,
  sanitizeFilename,
};
