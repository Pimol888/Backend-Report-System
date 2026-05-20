const express = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const controller = require("../controllers/ticketsController");
const { upload } = require("../middleware/upload");
const { userAuth, userOrAdminAuth, optionalUserOrAdminAuth } = require("../middleware/userAuth");

const router = express.Router();

// Use multer only for multipart; allow raw JSON (with imageUrl/imageUrls) without multer
function optionalUpload(req, res, next) {
  if (req.is("multipart/form-data")) {
    return upload.array("images", 6)(req, res, next);
  }
  next();
}

// Create ticket: public (no login) OR admin; optional auth for guest submit
router.post(
  "/",
  optionalUserOrAdminAuth,
  optionalUpload,
  asyncHandler(controller.createTicket)
);

// list all / filter by status + pagination (still requires user or admin)
router.get("/", userOrAdminAuth, asyncHandler(controller.listTickets));

// user checks ticket by code: public (no login) for track-by-code
router.get("/check", optionalUserOrAdminAuth, asyncHandler(controller.checkTicket));

// user update: form-data (images) OR raw JSON (imageUrl / imageUrls)
router.put("/:id", userOrAdminAuth, optionalUpload, asyncHandler(controller.updateTicket));

module.exports = router;
