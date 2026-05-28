const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { CYCLE_BADGE_LABELS, CYCLE_DETAIL_LABELS, MINISTRY } = require("../constants/report");
const { getConnection } = require("../db/pool");
const { HttpError } = require("../utils/httpError");
const {
  formatBytes,
  formatKhmerNowTimeLabel,
  formatSubmittedAtLabel,
  toMysqlDatetime,
} = require("../utils/format");
const adminNoteModel = require("../models/adminNote.model");
const departmentModel = require("../models/department.model");
const reportActivityLogModel = require("../models/reportActivityLog.model");
const reportModel = require("../models/report.model");
const reportFileModel = require("../models/reportFile.model");
const userModel = require("../models/user.model");
const { uploadRoot } = require("../middleware/upload.middleware");
const {
  notifyReportCreated,
  notifyReportNoteAdded,
  notifyReportResubmitted,
  notifyReportStatusChanged,
} = require("../realtime/notifier");
const { assertCanAccessReport, authFilters, resolveListScope } = require("../utils/scope");

function toSummaryRow(report, files) {
  const hasPdf = files.some((f) => f.type === "pdf");
  const hasWord = files.some((f) => f.type === "word");
  const totalBytes = files.reduce((sum, f) => sum + Number(f.sizeBytes || 0), 0);
  const prefix = hasPdf && hasWord ? "PDF + Word" : hasWord ? "Word" : "PDF";
  return {
    id: report.id,
    documentTitle: report.title,
    fileSummary: `${prefix} · ${formatBytes(totalBytes || 1024 * 1024)}`,
    cycle: report.cycle,
    submittedAtLabel: formatSubmittedAtLabel(report.submittedAt),
    status: report.status,
    fileCount: files.length,
    submittedBy: report.submitterName,
    description: report.description || undefined,
    departmentId: report.departmentId,
    departmentName: report.departmentName,
    generalDirectorateId: report.generalDirectorateId,
    generalDirectorateName: report.generalDirectorateName,
    _submittedAt: report.submittedAt,
  };
}

function toDetail(report, files, notes) {
  const totalSize = files.reduce((sum, f) => sum + Number(f.sizeBytes || 0), 0);
  return {
    id: report.id,
    title: report.title,
    cycle: report.cycle,
    cycleBadgeLabel: CYCLE_BADGE_LABELS[report.cycle],
    cycleDetailLabel: CYCLE_DETAIL_LABELS[report.cycle],
    periodLabel: report.periodLabel || "",
    departmentLine: report.departmentName || "",
    ministry: MINISTRY,
    submittedAtLabel: formatSubmittedAtLabel(report.submittedAt),
    submittedAtDetail: formatSubmittedAtLabel(report.submittedAt).replace(" · ", " នៅ "),
    reviewedAtDetail: report.reviewedAt
      ? formatSubmittedAtLabel(report.reviewedAt).replace(" · ", " នៅ ")
      : undefined,
    reviewerName: report.reviewerName || undefined,
    status: report.status,
    description: report.description || undefined,
    updatedLabel: "ធ្វើបច្ចុប្បន្នភាព ២ ម៉ោងមុន",
    submitter: {
      courtesyName: report.submitterCourtesyName || "លោក",
      name: report.submitterName,
      department: report.departmentName || "",
      email: report.submitterEmail || "",
      phone: report.submitterPhone || "",
    },
    adminNotes: notes.length
      ? notes.map((n) => ({ text: n.text, author: n.author, timeLabel: n.timeLabel, kind: n.kind }))
      : undefined,
    files: files.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      sizeLabel: formatBytes(Number(f.sizeBytes || 0)),
      pages: Number(f.pages || 0),
      uploadedLabel: "ដាក់ស្នើថ្ងៃនេះ",
    })),
    totalSizeLabel: formatBytes(totalSize || 1024),
  };
}

function toPublicActivityLog(entry) {
  return {
    action: entry.action,
    actorName: entry.actorName,
    fromStatus: entry.fromStatus || undefined,
    toStatus: entry.toStatus || undefined,
    message: entry.message || undefined,
    metadata: entry.metadata || undefined,
    createdAt: entry.createdAt,
  };
}

async function listReports(auth, query = {}) {
  const filters = { ...authFilters(auth) };
  if (query.cycle) filters.cycle = query.cycle;
  if (query.status) filters.status = query.status;
  if (query.departmentId) filters.departmentId = query.departmentId;
  if (query.generalDirectorateId) filters.generalDirectorateId = query.generalDirectorateId;
  if (query.search) filters.search = String(query.search).trim().toLowerCase();
  if (query.sort) filters.sort = query.sort;

  if (query.memberId) {
    const members = await userModel.listTeamMembers(resolveListScope(auth));
    const member = members.find((m) => m.id === String(query.memberId));
    if (!member) return { items: [], total: 0, page: 1, limit: 20 };
    filters.submitterName = member.name;
  }

  const reports = await reportModel.listReports(filters);
  const rows = [];
  for (const report of reports) {
    const files = await reportFileModel.listByReportId(report.id);
    rows.push(toSummaryRow(report, files));
  }

  rows.sort((a, b) => new Date(b._submittedAt).getTime() - new Date(a._submittedAt).getTime());
  if (query.sort === "oldest") rows.reverse();

  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
  const start = (page - 1) * limit;
  const items = rows.slice(start, start + limit).map(({ _submittedAt, ...rest }) => rest);
  return { items, total: rows.length, page, limit };
}

async function getReportStats(auth) {
  return reportModel.countByCycle(authFilters(auth));
}

async function getReportDetail(auth, reportId) {
  const report = await reportModel.findById(reportId);
  if (!report) throw new HttpError(404, "Report not found");
  assertCanAccessReport(auth, report);
  const [files, notes, activityLogs] = await Promise.all([
    reportFileModel.listByReportId(report.id),
    adminNoteModel.listByReportId(report.id),
    reportActivityLogModel.listByReportId(report.id),
  ]);
  return {
    ...toDetail(report, files, notes),
    activityLogs: activityLogs.map(toPublicActivityLog),
  };
}

function extractUpload(files, field) {
  const file = files?.[field]?.[0];
  if (!file) return null;
  return {
    name: file.originalname,
    storedName: file.filename,
    sizeBytes: Number(file.size || 0),
  };
}

async function createReport(auth, body, files) {
  const title = String(body.title || "").trim();
  const cycle = String(body.cycle || "");
  const reportDate = String(body.reportDate || "");
  if (!title || !["monthly", "quarterly", "semiannual", "yearly"].includes(cycle) || !reportDate) {
    throw new HttpError(400, "title, cycle, and reportDate are required");
  }
  const pdf = extractUpload(files, "pdf");
  const word = extractUpload(files, "word");
  if (!pdf || !word) throw new HttpError(400, "Both PDF and Word files are required");

  const submitter = await userModel.findById(auth.id);
  const departmentId = auth.departmentId || submitter?.departmentId;
  const department = departmentId ? await departmentModel.findById(departmentId) : null;
  if (!department) throw new HttpError(400, "User department is required to submit a report");

  const now = toMysqlDatetime(new Date());
  const id = randomUUID();
  const report = {
    id,
    title,
    cycle,
    status: "pending",
    description: body.description ? String(body.description).trim() : null,
    periodLabel: body.periodLabel ? String(body.periodLabel) : "",
    submittedAt: now,
    updatedAt: now,
    submitterId: auth.id,
    departmentId: department.id,
    generalDirectorateId: department.generalDirectorateId,
    reviewedAt: null,
    reviewerName: null,
  };

  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    await reportModel.insertReport(report, conn);
    await reportFileModel.insertFile(
      { id: randomUUID(), reportId: id, type: "pdf", name: pdf.name, storedName: pdf.storedName, sizeBytes: pdf.sizeBytes, uploadedAt: now, isResubmission: false },
      conn,
    );
    await reportFileModel.insertFile(
      { id: randomUUID(), reportId: id, type: "word", name: word.name, storedName: word.storedName, sizeBytes: word.sizeBytes, uploadedAt: now, isResubmission: false },
      conn,
    );
    await reportActivityLogModel.insertActivityLog(
      {
        id: randomUUID(),
        reportId: id,
        actorId: auth.id,
        actorName: auth.name || submitter?.name || "User",
        action: "created",
        toStatus: "pending",
        message: "Report submitted",
        metadata: { fileTypes: ["pdf", "word"] },
        createdAt: now,
      },
      conn,
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const created = await reportModel.findById(id);
  const reportFiles = await reportFileModel.listByReportId(id);
  const { _submittedAt, ...summary } = toSummaryRow(created, reportFiles);
  notifyReportCreated(summary);
  return summary;
}

async function updateReportStatus(auth, reportId, status) {
  if (!["reviewed", "pending"].includes(status)) throw new HttpError(400, "Invalid status");
  const report = await reportModel.findById(reportId);
  if (!report) throw new HttpError(404, "Report not found");
  assertCanAccessReport(auth, report);

  const reviewedAt = status === "reviewed" ? toMysqlDatetime(new Date()) : null;
  const reviewerName = status === "reviewed" ? auth.name : null;
  const now = toMysqlDatetime(new Date());
  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    await reportModel.updateStatus(reportId, { status, reviewedAt, reviewerName, updatedAt: now }, conn);
    await reportActivityLogModel.insertActivityLog(
      {
        id: randomUUID(),
        reportId,
        actorId: auth.id,
        actorName: auth.name || "Admin",
        action: "status_changed",
        fromStatus: report.status,
        toStatus: status,
        message: `Status changed from ${report.status} to ${status}`,
        createdAt: now,
      },
      conn,
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const updated = await reportModel.findById(reportId);
  const files = await reportFileModel.listByReportId(reportId);
  const { _submittedAt, ...summary } = toSummaryRow(updated, files);
  notifyReportStatusChanged(summary);
  return summary;
}

async function addReportNote(auth, reportId, text, kind = "comment") {
  const noteText = String(text || "").trim();
  if (!noteText) throw new HttpError(400, "text is required");
  if (!["comment", "request-files"].includes(kind)) throw new HttpError(400, "Invalid note kind");

  const report = await reportModel.findById(reportId);
  if (!report) throw new HttpError(404, "Report not found");
  assertCanAccessReport(auth, report);

  const now = new Date();
  const note = {
    id: randomUUID(),
    reportId,
    text: noteText,
    author: auth.name || "Admin",
    timeLabel: formatKhmerNowTimeLabel(now),
    kind,
    createdAt: toMysqlDatetime(now),
  };
  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    await adminNoteModel.insertNote(note, conn);
    await reportActivityLogModel.insertActivityLog(
      {
        id: randomUUID(),
        reportId,
        actorId: auth.id,
        actorName: auth.name || "Admin",
        action: "note_added",
        message: kind === "request-files" ? "Admin requested file resubmission" : "Admin added a note",
        metadata: { kind },
        createdAt: note.createdAt,
      },
      conn,
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  const publicNote = { text: note.text, author: note.author, timeLabel: note.timeLabel, kind: note.kind };
  notifyReportNoteAdded(report, publicNote);
  return publicNote;
}

async function resubmitFiles(auth, reportId, files) {
  const pdf = extractUpload(files, "pdf");
  const word = extractUpload(files, "word");
  if (!pdf || !word) throw new HttpError(400, "Both PDF and Word files are required");

  const report = await reportModel.findById(reportId);
  if (!report) throw new HttpError(404, "Report not found");
  assertCanAccessReport(auth, report);

  const latest = await adminNoteModel.findLatestByReportId(reportId);
  if (!latest || latest.kind !== "request-files") {
    throw new HttpError(400, "No pending file request for this report");
  }

  const now = toMysqlDatetime(new Date());
  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    await reportFileModel.insertFile(
      { id: randomUUID(), reportId, type: "pdf", name: pdf.name, storedName: pdf.storedName, sizeBytes: pdf.sizeBytes, uploadedAt: now, isResubmission: true },
      conn,
    );
    await reportFileModel.insertFile(
      { id: randomUUID(), reportId, type: "word", name: word.name, storedName: word.storedName, sizeBytes: word.sizeBytes, uploadedAt: now, isResubmission: true },
      conn,
    );
    await reportModel.updateStatus(reportId, { status: "pending", reviewedAt: null, reviewerName: null, updatedAt: now }, conn);
    await reportActivityLogModel.insertActivityLog(
      {
        id: randomUUID(),
        reportId,
        actorId: auth.id,
        actorName: auth.name || "User",
        action: "files_resubmitted",
        fromStatus: report.status,
        toStatus: "pending",
        message: "Report files resubmitted",
        metadata: { fileTypes: ["pdf", "word"] },
        createdAt: now,
      },
      conn,
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const detail = await getReportDetail(auth, reportId);
  notifyReportResubmitted({
    id: reportId,
    departmentId: report.departmentId,
    submitterId: report.submitterId,
    status: "pending",
  });
  return detail;
}

async function getReportActivityLogs(auth, reportId) {
  const report = await reportModel.findById(reportId);
  if (!report) throw new HttpError(404, "Report not found");
  assertCanAccessReport(auth, report);
  const activityLogs = await reportActivityLogModel.listByReportId(reportId);
  return activityLogs.map(toPublicActivityLog);
}

async function getReportFile(auth, reportId, fileId) {
  const report = await reportModel.findById(reportId);
  if (!report) throw new HttpError(404, "Report not found");
  assertCanAccessReport(auth, report);

  const file = await reportFileModel.findById(fileId, reportId);
  if (!file) throw new HttpError(404, "File not found");
  if (file.storedName.startsWith("seed-")) {
    throw new HttpError(404, "Seed file has no binary on disk");
  }

  return {
    path: path.join(uploadRoot, "temp", file.storedName),
    downloadName: file.name,
  };
}

module.exports = {
  addReportNote,
  createReport,
  getReportActivityLogs,
  getReportDetail,
  getReportFile,
  getReportStats,
  listReports,
  resubmitFiles,
  updateReportStatus,
};
