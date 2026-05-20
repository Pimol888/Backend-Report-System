const express = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const { userAuth } = require("../middleware/userAuth");
const { adminAuth } = require("../middleware/adminAuth");
const authController = require("../controllers/authController");

const router = express.Router();

// USER AUTH (role=user)
router.post("/register", asyncHandler(authController.register));
router.post("/login", asyncHandler(authController.login));
router.post("/forgot-password", asyncHandler(authController.forgotPassword));
router.post("/reset-password", asyncHandler(authController.resetPasswordHandler));
// User only: force change default password (requires user JWT)
router.post("/force-change-password", userAuth, asyncHandler(authController.forceChangePasswordHandler));
// Admin/super_admin: force change default password (requires admin JWT)
router.post("/force-change-password-admin", adminAuth, asyncHandler(authController.forceChangePasswordAdminHandler));

module.exports = router;

