const multer = require("multer");
const path = require("node:path");
const fs = require("node:fs");
const { nanoid } = require("nanoid");
const { HttpError } = require("../utils/httpError");

const uploadRoot = path.join(process.cwd(), "uploads", "reports");
const tempRoot = path.join(uploadRoot, "temp");

function ensureDirs() {
  fs.mkdirSync(tempRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureDirs();
    cb(null, tempRoot);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    cb(null, `report-${nanoid(12)}${ext}`);
  },
});

function reportFileFilter(req, file, cb) {
  const name = String(file.originalname || "").toLowerCase();
  const type = String(file.mimetype || "").toLowerCase();
  const isPdf = name.endsWith(".pdf") || type === "application/pdf";
  const isWord = name.endsWith(".doc") || name.endsWith(".docx") || type.includes("word");
  if (!isPdf && !isWord) {
    return cb(new HttpError(400, "Only PDF/Word files are allowed"));
  }
  cb(null, true);
}

const reportUpload = multer({
  storage,
  fileFilter: reportFileFilter,
  limits: { fileSize: 25 * 1024 * 1024 },
});

function uploadRequiredReportFiles(req, res, next) {
  reportUpload.fields([{ name: "pdf", maxCount: 1 }, { name: "word", maxCount: 1 }])(req, res, (err) => {
    if (err) return next(err);
    const files = req.files || {};
    if (!files.pdf || !files.word) return next(new HttpError(400, "Both PDF and Word files are required"));
    next();
  });
}

module.exports = {
  uploadRequiredReportFiles,
  uploadRoot,
};
