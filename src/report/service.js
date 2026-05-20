const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { HttpError } = require("../utils/httpError");
const { getDb, updateDb } = require("./store");
const {
  buildStoredFilePath,
  extensionByType,
  formatBytes,
  formatKhmerNowTimeLabel,
  formatSubmittedAtLabel,
  parseSizeToBytes,
} = require("./helpers");
const { uploadRoot } = require("./upload");

const CYCLE_BADGE = { monthly: "ប្រចាំខែ", quarterly: "ត្រីមាស", semiannual: "ឆមាស", yearly: "ប្រចាំឆ្នាំ" };
const CYCLE_DETAIL = {
  monthly: "របាយការណ៍ប្រចាំខែ (១ ខែ)",
  quarterly: "របាយការណ៍ត្រីមាស (៣ ខែ)",
  semiannual: "របាយការណ៍ឆមាស (៦ ខែ)",
  yearly: "របាយការណ៍ប្រចាំឆ្នាំ (១ ឆ្នាំ)",
};

function getDepartment(db, id) {
  return db.departments.find((d) => d.id === id) || null;
}

function getGeneralDirectorate(db, id) {
  return db.generalDirectorates.find((g) => g.id === id) || null;
}

function assertCanAccessReport(auth, report) {
  if (auth.role === "superadmin") return;
  if (auth.role === "admin") {
    if (!auth.departmentId || auth.departmentId !== report.departmentId) {
      throw new HttpError(403, "Cannot access report outside your department");
    }
    return;
  }
  if (auth.departmentId && auth.departmentId !== report.departmentId) {
    throw new HttpError(403, "Cannot access report outside your department");
  }
}

function toSummaryRow(db, report) {
  const files = db.reportFiles.filter((f) => f.reportId === report.id);
  const hasPdf = files.some((f) => f.type === "pdf");
  const hasWord = files.some((f) => f.type === "word");
  const totalBytes = files.reduce((sum, f) => sum + Number(f.sizeBytes || 0), 0);
  const prefix = hasPdf && hasWord ? "PDF + Word" : hasWord ? "Word" : "PDF";
  const department = getDepartment(db, report.departmentId);
  const gd = getGeneralDirectorate(db, report.generalDirectorateId);
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
    departmentId: department ? department.id : null,
    departmentName: department ? department.name : null,
    generalDirectorateId: gd ? gd.id : null,
    generalDirectorateName: gd ? gd.name : null,
    _submittedAt: report.submittedAt,
  };
}

function publicSummary(row) {
  const { _submittedAt, ...rest } = row;
  return rest;
}

function toDetail(db, report) {
  const notes = db.reportNotes
    .filter((n) => n.reportId === report.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((n) => ({ text: n.text, author: n.author, timeLabel: n.timeLabel, kind: n.kind || undefined }));
  const files = db.reportFiles
    .filter((f) => f.reportId === report.id)
    .sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());
  const totalSize = files.reduce((sum, f) => sum + Number(f.sizeBytes || 0), 0);
  const department = getDepartment(db, report.departmentId);
  const submitterUser = db.users.find((u) => u.id === report.submitterId);
  return {
    id: report.id,
    title: report.title,
    cycle: report.cycle,
    cycleBadgeLabel: CYCLE_BADGE[report.cycle],
    cycleDetailLabel: CYCLE_DETAIL[report.cycle],
    periodLabel: report.periodLabel || "",
    departmentLine: department ? department.name : "",
    ministry: "ក្រសួងមហាផ្ទៃ",
    submittedAtLabel: formatSubmittedAtLabel(report.submittedAt),
    submittedAtDetail: formatSubmittedAtLabel(report.submittedAt).replace(" · ", " នៅ "),
    reviewedAtDetail: report.reviewedAt ? formatSubmittedAtLabel(report.reviewedAt).replace(" · ", " នៅ ") : undefined,
    reviewerName: report.reviewerName || undefined,
    status: report.status,
    description: report.description || undefined,
    updatedLabel: "ធ្វើបច្ចុប្បន្នភាព ២ ម៉ោងមុន",
    submitter: {
      courtesyName: submitterUser?.courtesyName || "លោក",
      name: report.submitterName,
      department: department ? department.name : "",
      email: submitterUser?.email || "",
      phone: submitterUser?.phone || "",
    },
    adminNotes: notes.length ? notes : undefined,
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

function filterRowsByAuth(auth, rows) {
  if (auth.role === "superadmin") return rows;
  if (auth.role === "admin") return rows.filter((r) => r.departmentId === auth.departmentId);
  return rows.filter((r) => r.departmentId === auth.departmentId);
}

async function listReports(auth, query) {
  const db = await getDb();
  let rows = db.reports.map((r) => toSummaryRow(db, r));
  rows = filterRowsByAuth(auth, rows);

  if (query.cycle) rows = rows.filter((r) => r.cycle === query.cycle);
  if (query.status) rows = rows.filter((r) => r.status === query.status);
  if (query.departmentId) rows = rows.filter((r) => r.departmentId === query.departmentId);
  if (query.generalDirectorateId) rows = rows.filter((r) => r.generalDirectorateId === query.generalDirectorateId);
  if (query.memberId) {
    const member = db.teamMembers.find((m) => m.id === String(query.memberId));
    rows = member ? rows.filter((r) => r.submittedBy === member.name) : [];
  }

  if (query.search) {
    const q = String(query.search).trim().toLowerCase();
    rows = rows.filter((r) =>
      [r.documentTitle, r.submittedBy || "", r.fileSummary, r.departmentName || "", r.generalDirectorateName || ""]
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }

  rows.sort((a, b) => new Date(b._submittedAt).getTime() - new Date(a._submittedAt).getTime());
  if (query.sort === "oldest") rows.reverse();
  if (query.sort === "title") rows.sort((a, b) => a.documentTitle.localeCompare(b.documentTitle));

  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
  const start = (page - 1) * limit;
  const items = rows.slice(start, start + limit).map(({ _submittedAt, ...rest }) => rest);
  return { items, total: rows.length, page, limit };
}

async function getReportStats(auth) {
  const { items } = await listReports(auth, {});
  return items.reduce(
    (acc, row) => {
      acc[row.cycle] += 1;
      return acc;
    },
    { monthly: 0, quarterly: 0, semiannual: 0, yearly: 0 },
  );
}

async function getReportDetail(auth, reportId) {
  const db = await getDb();
  const report = db.reports.find((r) => r.id === String(reportId));
  if (!report) throw new HttpError(404, "Report not found");
  assertCanAccessReport(auth, report);
  return toDetail(db, report);
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

  return updateDb((db) => {
    const submitter = db.users.find((u) => u.id === auth.id);
    const departmentId = auth.departmentId || submitter?.departmentId || db.departments[0]?.id || null;
    const dept = getDepartment(db, departmentId);
    const now = new Date().toISOString();
    const id = randomUUID();
    const report = {
      id,
      title,
      cycle,
      status: "pending",
      description: body.description ? String(body.description).trim() : null,
      submittedAt: now,
      periodLabel: body.periodLabel ? String(body.periodLabel) : "",
      submitterId: auth.id,
      submitterName: submitter?.name || auth.name || "អ្នកប្រើប្រាស់",
      departmentId,
      generalDirectorateId: dept ? dept.generalDirectorateId : null,
      reviewedAt: null,
      reviewerName: null,
    };
    db.reports.push(report);
    db.reportFiles.push({
      id: randomUUID(),
      reportId: id,
      type: "pdf",
      name: pdf.name,
      storedName: pdf.storedName,
      sizeBytes: pdf.sizeBytes,
      pages: 0,
      uploadedAt: now,
      source: "upload",
    });
    db.reportFiles.push({
      id: randomUUID(),
      reportId: id,
      type: "word",
      name: word.name,
      storedName: word.storedName,
      sizeBytes: word.sizeBytes,
      pages: 0,
      uploadedAt: now,
      source: "upload",
    });
    return publicSummary(toSummaryRow(db, report));
  });
}

async function updateReportStatus(auth, reportId, status) {
  if (!["reviewed", "pending"].includes(status)) throw new HttpError(400, "Invalid status");
  if (!["admin", "superadmin"].includes(auth.role)) throw new HttpError(403, "Admin only");
  return updateDb((db) => {
    const report = db.reports.find((r) => r.id === String(reportId));
    if (!report) throw new HttpError(404, "Report not found");
    assertCanAccessReport(auth, report);
    report.status = status;
    report.reviewedAt = status === "reviewed" ? new Date().toISOString() : null;
    report.reviewerName = status === "reviewed" ? auth.name : null;
    return publicSummary(toSummaryRow(db, report));
  });
}

async function addReportNote(auth, reportId, text, kind = "comment") {
  if (!["admin", "superadmin"].includes(auth.role)) throw new HttpError(403, "Admin only");
  const noteText = String(text || "").trim();
  if (!noteText) throw new HttpError(400, "text is required");
  if (!["comment", "request-files"].includes(kind)) throw new HttpError(400, "Invalid note kind");
  return updateDb((db) => {
    const report = db.reports.find((r) => r.id === String(reportId));
    if (!report) throw new HttpError(404, "Report not found");
    assertCanAccessReport(auth, report);
    const now = new Date();
    const note = {
      id: randomUUID(),
      reportId: report.id,
      text: noteText,
      author: auth.name || "Admin",
      timeLabel: formatKhmerNowTimeLabel(now),
      kind,
      createdAt: now.toISOString(),
    };
    db.reportNotes.push(note);
    return { text: note.text, author: note.author, timeLabel: note.timeLabel, kind: note.kind };
  });
}

async function resubmitFiles(auth, reportId, files) {
  if (auth.role !== "user") throw new HttpError(403, "Only users can resubmit");
  const pdf = extractUpload(files, "pdf");
  const word = extractUpload(files, "word");
  if (!pdf || !word) throw new HttpError(400, "Both PDF and Word files are required");
  await updateDb((db) => {
    const report = db.reports.find((r) => r.id === String(reportId));
    if (!report) throw new HttpError(404, "Report not found");
    assertCanAccessReport(auth, report);
    const notes = db.reportNotes
      .filter((n) => n.reportId === report.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (!notes[0] || notes[0].kind !== "request-files") {
      throw new HttpError(400, "No pending file request for this report");
    }
    const now = new Date().toISOString();
    db.reportFiles.push({ id: randomUUID(), reportId: report.id, type: "pdf", name: pdf.name, storedName: pdf.storedName, sizeBytes: pdf.sizeBytes, pages: 0, uploadedAt: now, source: "resubmission" });
    db.reportFiles.push({ id: randomUUID(), reportId: report.id, type: "word", name: word.name, storedName: word.storedName, sizeBytes: word.sizeBytes, pages: 0, uploadedAt: now, source: "resubmission" });
    report.status = "pending";
  });
  return getReportDetail(auth, reportId);
}

async function getReportFile(auth, reportId, fileId) {
  const db = await getDb();
  const report = db.reports.find((r) => r.id === String(reportId));
  if (!report) throw new HttpError(404, "Report not found");
  assertCanAccessReport(auth, report);
  const file = db.reportFiles.find((f) => f.id === String(fileId) && f.reportId === report.id);
  if (!file) throw new HttpError(404, "File not found");
  if (file.source === "seed") throw new HttpError(404, "Seed file has no binary on disk");
  return { path: buildStoredFilePath(path.join(uploadRoot, "temp"), file.storedName), downloadName: file.name };
}

async function getMetaData(auth) {
  const db = await getDb();
  const teamMembers = auth.role === "superadmin"
    ? db.teamMembers
    : db.teamMembers.filter((m) => {
        const dept = db.departments.find((d) => d.submitterNames.includes(m.name));
        return dept?.id === auth.departmentId;
      });
  const departments = auth.role === "superadmin"
    ? db.departments
    : db.departments.filter((d) => d.id === auth.departmentId);
  const generalDirectorates = auth.role === "superadmin"
    ? db.generalDirectorates
    : db.generalDirectorates.filter((g) => g.departments.some((d) => d.id === auth.departmentId));
  return { teamMembers, departments, generalDirectorates };
}

module.exports = {
  addReportNote,
  createReport,
  getMetaData,
  getReportDetail,
  getReportFile,
  getReportStats,
  listReports,
  resubmitFiles,
  updateReportStatus,
};
