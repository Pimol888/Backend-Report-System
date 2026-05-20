const jwt = require("jsonwebtoken");
const { config } = require("../config/env");

function userAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) {
    return res.status(401).json({ success: false, message: "Missing Bearer token" });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (payload.role !== "user") {
      return res.status(403).json({ success: false, message: "User access required" });
    }
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

/** Accepts user, admin, or super_admin token (e.g. for legacy ticket creation when admin visits /submit). */
function userOrAdminAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) {
    return res.status(401).json({ success: false, message: "Missing Bearer token" });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const role = payload.role;
    if (role !== "user" && role !== "admin" && role !== "super_admin") {
      return res.status(403).json({ success: false, message: "Authentication required" });
    }
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

/** Optional auth: no token => req.user = null; valid user/admin/super_admin token => req.user = payload. For public submit/track. */
function optionalUserOrAdminAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) {
    req.user = null;
    return next();
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const role = payload.role;
    if (role !== "user" && role !== "admin" && role !== "super_admin") {
      req.user = null;
      return next();
    }
    req.user = payload;
    return next();
  } catch {
    req.user = null;
    return next();
  }
}

module.exports = { userAuth, userOrAdminAuth, optionalUserOrAdminAuth };

