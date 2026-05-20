const { HttpError } = require("../utils/httpError");
const { validateCreateWorkLog, validateUpdateWorkLog, validateFollowBody } = require("../validators/workLogValidators");
const workLogService = require("../services/workLogService");

async function create(req, res) {
  const validation = validateCreateWorkLog(req.body);
  if (!validation.ok) throw new HttpError(400, validation.error);
  req.validated = validation.value;
  const log = await workLogService.create(req);
  return res.status(201).json({
    success: true,
    message: "Work log created",
    data: { log },
  });
}

async function listMy(req, res) {
  const logs = await workLogService.listMy(req);
  return res.json({ success: true, data: { logs } });
}

async function listAll(req, res) {
  const logs = await workLogService.listAll(req);
  return res.json({ success: true, data: { logs } });
}

async function listByAdminId(req, res) {
  const logs = await workLogService.listByAdminId(req);
  return res.json({ success: true, data: { logs } });
}

async function getById(req, res) {
  const log = await workLogService.getById(req.params.id, req);
  if (!log) throw new HttpError(404, "Work log not found");
  return res.json({ success: true, data: { log } });
}

async function update(req, res) {
  const validation = validateUpdateWorkLog(req.body);
  if (!validation.ok) throw new HttpError(400, validation.error);
  req.validated = validation.value;
  const log = await workLogService.update(req.params.id, req);
  return res.json({
    success: true,
    message: "Work log updated",
    data: { log },
  });
}

async function remove(req, res) {
  const found = await workLogService.remove(req.params.id, req);
  if (!found) throw new HttpError(404, "Work log not found");
  return res.json({ success: true, message: "Work log deleted" });
}

async function follow(req, res) {
  const validation = validateFollowBody(req.body);
  if (!validation.ok) throw new HttpError(400, validation.error);
  const result = await workLogService.follow(validation.value.adminId, req);
  return res.json({
    success: true,
    message: result.already ? "Already following" : "Now following admin",
    data: result,
  });
}

async function unfollow(req, res) {
  const adminId = req.params.adminId;
  if (!adminId) throw new HttpError(400, "adminId required");
  await workLogService.unfollow(adminId, req);
  return res.json({ success: true, message: "Unfollowed" });
}

async function followedFeed(req, res) {
  const logs = await workLogService.getFollowedFeed(req);
  return res.json({ success: true, data: { logs } });
}

async function listAdminsForDropdown(req, res) {
  const admins = await workLogService.listAdminsForDropdown(req);
  return res.json({ success: true, data: { admins } });
}

async function listFollowedAdmins(req, res) {
  const admins = await workLogService.listFollowedAdmins(req);
  return res.json({ success: true, data: { admins } });
}

/** Export: type=weekly|monthly|custom (with startDate&endDate). format=json|csv. For super_admin, optional adminId. */
async function exportReport(req, res) {
  const type = (req.query.type || "weekly").toLowerCase();
  const format = (req.query.format || "json").toLowerCase();
  const query = { ...req.query };
  if (type === "weekly") query.filter = "week";
  else if (type === "monthly") query.filter = "month";
  // else custom: use startDate & endDate from query

  const { logs, range } = await workLogService.getExportData(req, query);
  if (format === "csv") {
    const csv = workLogService.buildReportCsv(logs);
    const utf8Bom = "\uFEFF";
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="work-log-report-${range ? range.start : "all"}.csv"`);
    return res.send(utf8Bom + csv);
  }
  return res.json({
    success: true,
    data: {
      logs,
      range: range || null,
      type,
    },
  });
}

module.exports = {
  create,
  listMy,
  listAll,
  listByAdminId,
  getById,
  update,
  remove,
  follow,
  unfollow,
  followedFeed,
  listAdminsForDropdown,
  listFollowedAdmins,
  exportReport,
};
