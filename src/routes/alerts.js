const express = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const alertController = require("../controllers/alertController");

const router = express.Router();

// Public: anyone can list alerts (read-only)
router.get("/", asyncHandler(alertController.list));

module.exports = router;
