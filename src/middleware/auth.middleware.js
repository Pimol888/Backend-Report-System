const jwt = require("jsonwebtoken");
const { config } = require("../config/env");
const { HttpError } = require("../utils/httpError");

function getTokenFromHeader(req) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
}

function authenticate(req, res, next) {
  try {
    const token = getTokenFromHeader(req);
    if (!token) throw new HttpError(401, "Missing Bearer token");
    const payload = jwt.verify(token, config.jwtSecret);
    req.auth = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      name: payload.name,
      departmentId: payload.departmentId || null,
      generalDirectorateId: payload.generalDirectorateId || null,
    };
    next();
  } catch (err) {
    next(err instanceof HttpError ? err : new HttpError(401, "Invalid or expired token"));
  }
}

function requireRoles(roles) {
  const allowed = new Set(roles);
  return (req, res, next) => {
    if (!req.auth) return next(new HttpError(401, "Unauthorized"));
    if (!allowed.has(req.auth.role)) return next(new HttpError(403, "Forbidden"));
    next();
  };
}

module.exports = {
  authenticate,
  requireRoles,
};
