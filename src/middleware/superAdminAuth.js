function superAdminAuth(req, res, next) {
  if (!req.admin) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }
  if (req.admin.role !== "super_admin") {
    return res.status(403).json({ success: false, message: "Super admin access required" });
  }
  return next();
}

module.exports = { superAdminAuth };
