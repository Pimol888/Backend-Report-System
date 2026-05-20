const multer = require("multer");
const path = require("path");
const { nanoid } = require("nanoid");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join("uploads", "tickets")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    cb(null, `ticket-${nanoid(10)}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image files are allowed"));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 6 * 1024 * 1024 }, // 6MB each
});

/** Run multer only when request is multipart (e.g. for optional solution image) */
function optionalSingle(fieldName) {
  return (req, res, next) => {
    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) return next();
    upload.single(fieldName)(req, res, next);
  };
}

// Meeting notes: images stored in uploads/meeting-notes
const meetingNoteStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join("uploads", "meeting-notes")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    cb(null, `note-${nanoid(10)}${ext}`);
  },
});
const uploadMeetingNote = multer({
  storage: meetingNoteStorage,
  fileFilter,
  limits: { fileSize: 6 * 1024 * 1024 },
});

/** Optional single image for meeting note (multipart only) */
function optionalSingleMeetingNote(fieldName) {
  return (req, res, next) => {
    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) return next();
    uploadMeetingNote.single(fieldName)(req, res, next);
  };
}

// Work log PDF attachment: uploads/work-logs, PDF only
const workLogStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join("uploads", "work-logs")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "") || ".pdf";
    cb(null, `worklog-${nanoid(10)}${ext}`);
  },
});
function workLogFileFilter(req, file, cb) {
  if (file.mimetype !== "application/pdf") {
    return cb(new Error("Only PDF files are allowed for work log attachment"));
  }
  cb(null, true);
}
const uploadWorkLogPdf = multer({
  storage: workLogStorage,
  fileFilter: workLogFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
/** Optional single PDF for work log (multipart only). Field name: attachment */
function optionalWorkLogPdf(fieldName = "attachment") {
  return (req, res, next) => {
    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) return next();
    uploadWorkLogPdf.single(fieldName)(req, res, next);
  };
}

module.exports = {
  upload,
  optionalSingle,
  uploadMeetingNote,
  optionalSingleMeetingNote,
  optionalWorkLogPdf,
};
