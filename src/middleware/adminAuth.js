const jwt = require("jsonwebtoken");
const { config } = require("../config/env");

function adminAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) {
    return res.status(401).json({ success: false, message: "Missing Bearer token" });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (payload.role !== "admin" && payload.role !== "super_admin") {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }
    req.admin = payload;
    return next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

module.exports = { adminAuth };

