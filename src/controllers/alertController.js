const { HttpError } = require("../utils/httpError");
const { validateCreateAlert, validateUpdateAlert } = require("../validators/alertValidators");
const {
  listAlerts,
  getAlertById,
  createAlert,
  updateAlert,
  deleteAlert,
} = require("../services/alertService");

async function list(req, res) {
  const alerts = await listAlerts();
  return res.json({ success: true, data: { alerts } });
}

async function getById(req, res) {
  const alert = await getAlertById(req.params.id);
  if (!alert) throw new HttpError(404, "Alert not found");
  return res.json({ success: true, data: { alert } });
}

async function create(req, res) {
  const validation = validateCreateAlert(req.body);
  if (!validation.ok) throw new HttpError(400, validation.error);
  const alert = await createAlert(validation.value);
  return res.status(201).json({
    success: true,
    message: "Alert created",
    data: { alert },
  });
}

async function update(req, res) {
  const validation = validateUpdateAlert(req.body);
  if (!validation.ok) throw new HttpError(400, validation.error);
  const alert = await updateAlert(req.params.id, validation.value);
  if (!alert) throw new HttpError(404, "Alert not found");
  return res.json({
    success: true,
    message: "Alert updated",
    data: { alert },
  });
}

async function remove(req, res) {
  const found = await deleteAlert(req.params.id);
  if (!found) throw new HttpError(404, "Alert not found");
  return res.json({ success: true, message: "Alert deleted" });
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
};
