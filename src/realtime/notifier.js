const { emitToRooms } = require("./socket");
const { EVENTS, ROOMS } = require("./events");

function reportRooms(report, { includeSubmitter = true } = {}) {
  const rooms = [ROOMS.admins(), ROOMS.superadmins()];
  if (report.departmentId) rooms.push(ROOMS.department(report.departmentId));
  if (includeSubmitter && report.submitterId) rooms.push(ROOMS.user(report.submitterId));
  return rooms;
}

function notifyReportCreated(report) {
  emitToRooms(reportRooms(report), EVENTS.REPORT_CREATED, { report });
}

function notifyReportUpdated(report) {
  emitToRooms(reportRooms(report), EVENTS.REPORT_UPDATED, { report });
}

function notifyReportStatusChanged(report) {
  emitToRooms(reportRooms(report), EVENTS.REPORT_STATUS_CHANGED, {
    reportId: report.id,
    status: report.status,
    report,
  });
}

function notifyReportNoteAdded(report, note) {
  emitToRooms(reportRooms(report), EVENTS.REPORT_NOTE_ADDED, {
    reportId: report.id,
    note,
  });
}

function notifyReportResubmitted(report) {
  emitToRooms(reportRooms(report), EVENTS.REPORT_RESUBMITTED, { report });
}

module.exports = {
  notifyReportCreated,
  notifyReportNoteAdded,
  notifyReportResubmitted,
  notifyReportStatusChanged,
  notifyReportUpdated,
};
