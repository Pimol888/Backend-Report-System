const express = require("express");
const authRoutes = require("./auth.routes");
const reportRoutes = require("./report.routes");
const metaRoutes = require("./meta.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/reports", reportRoutes);
router.use("/", metaRoutes);

module.exports = router;
