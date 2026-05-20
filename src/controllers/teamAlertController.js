const { HttpError } = require("../utils/httpError");
const { validateCreateTeamAlert, validateUpdateTeamAlert } = require("../validators/teamAlertValidators");
const {
  listTeamAlerts,
  getTeamAlertById,
  createTeamAlert,
  updateTeamAlert,
  deleteTeamAlert,
} = require("../services/teamAlertService");

async function list(req, res) {
  const teamAlerts = await listTeamAlerts();
  return res.json({ success: true, data: { teamAlerts } });
}

async function getById(req, res) {
  const teamAlert = await getTeamAlertById(req.params.id);
  if (!teamAlert) throw new HttpError(404, "Team alert not found");
  return res.json({ success: true, data: { teamAlert } });
}

async function create(req, res) {
  const validation = validateCreateTeamAlert(req.body);
  if (!validation.ok) throw new HttpError(400, validation.error);
  const teamAlert = await createTeamAlert(validation.value);
  return res.status(201).json({
    success: true,
    message: "Team alert created",
    data: { teamAlert },
  });
}

async function update(req, res) {
  const validation = validateUpdateTeamAlert(req.body);
  if (!validation.ok) throw new HttpError(400, validation.error);
  const teamAlert = await updateTeamAlert(req.params.id, validation.value);
  if (!teamAlert) throw new HttpError(404, "Team alert not found");
  return res.json({
    success: true,
    message: "Team alert updated",
    data: { teamAlert },
  });
}

async function remove(req, res) {
  const found = await deleteTeamAlert(req.params.id);
  if (!found) throw new HttpError(404, "Team alert not found");
  return res.json({ success: true, message: "Team alert deleted" });
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
};
