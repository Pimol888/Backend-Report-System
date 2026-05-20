const express = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const teamAlertController = require("../controllers/teamAlertController");

const router = express.Router();

// Public: anyone can list team alerts (read-only)
router.get("/", asyncHandler(teamAlertController.list));

module.exports = router;
