const express = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const metaController = require("../controllers/meta.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authenticate);

router.get("/team-members", asyncHandler(metaController.teamMembers));
router.get("/departments", asyncHandler(metaController.departments));
router.get("/general-directorates", asyncHandler(metaController.generalDirectorates));

module.exports = router;
