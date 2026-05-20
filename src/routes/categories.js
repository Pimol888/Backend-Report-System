const express = require("express");
const { getActiveCategories } = require("../config/categories");

const router = express.Router();

/** GET /api/categories — list active categories for the ticket form */
router.get("/", (req, res) => {
  const categories = getActiveCategories();
  res.json({ success: true, data: { categories } });
});

module.exports = router;
