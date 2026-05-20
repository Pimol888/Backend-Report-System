const express = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const { adminAuth } = require("../middleware/adminAuth");
const { upload } = require("../middleware/upload");
const admin = require("../controllers/adminTicketsController");

const router = express.Router();

// list
router.get("/tickets", adminAuth, asyncHandler(admin.adminListTickets));

// ✅ admin update: status/adminComment/solution + images replace/append
router.patch("/tickets/:id", adminAuth, upload.array("images", 6), asyncHandler(admin.adminUpdateTicket));

module.exports = router;
