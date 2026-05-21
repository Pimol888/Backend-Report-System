const { HttpError } = require("../utils/httpError");
const authService = require("../services/auth.service");

async function login(req, res) {
  const { email, password } = req.body || {};
  const result = await authService.login(email, password);
  res.json({ success: true, data: result });
}

async function me(req, res) {
  const user = await authService.getUserById(req.auth.id);
  if (!user) throw new HttpError(404, "User not found");
  res.json({ success: true, data: { user } });
}

module.exports = { login, me };
