const reportService = require("../services/report.service");

async function list(req, res) {
  const data = await reportService.listReports(req.auth, req.query || {});
  res.json({ success: true, data });
}

async function stats(req, res) {
  const data = await reportService.getReportStats(req.auth);
  res.json({ success: true, data });
}

async function detail(req, res) {
  const data = await reportService.getReportDetail(req.auth, req.params.reportId);
  res.json({ success: true, data });
}

async function create(req, res) {
  const data = await reportService.createReport(req.auth, req.body || {}, req.files || {});
  res.status(201).json({ success: true, data });
}

async function updateStatus(req, res) {
  const data = await reportService.updateReportStatus(req.auth, req.params.reportId, req.body?.status);
  res.json({ success: true, data });
}

async function addNote(req, res) {
  const data = await reportService.addReportNote(
    req.auth,
    req.params.reportId,
    req.body?.text,
    req.body?.kind || "comment",
  );
  res.status(201).json({ success: true, data });
}

async function resubmit(req, res) {
  const data = await reportService.resubmitFiles(req.auth, req.params.reportId, req.files || {});
  res.json({ success: true, data });
}

async function downloadFile(req, res) {
  const data = await reportService.getReportFile(req.auth, req.params.reportId, req.params.fileId);
  res.download(data.path, data.downloadName);
}

module.exports = {
  addNote,
  create,
  detail,
  downloadFile,
  list,
  resubmit,
  stats,
  updateStatus,
};
