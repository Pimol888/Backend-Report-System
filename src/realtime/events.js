const EVENTS = Object.freeze({
  REPORT_CREATED: "report:created",
  REPORT_UPDATED: "report:updated",
  REPORT_STATUS_CHANGED: "report:status-changed",
  REPORT_NOTE_ADDED: "report:note-added",
  REPORT_RESUBMITTED: "report:resubmitted",
});

const ROOMS = Object.freeze({
  admins: () => "admins",
  superadmins: () => "superadmins",
  user: (userId) => `user:${userId}`,
  department: (departmentId) => `department:${departmentId}`,
});

module.exports = { EVENTS, ROOMS };
