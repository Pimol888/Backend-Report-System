const multer = require("multer");
const { HttpError } = require("../utils/httpError");

function errorHandler(err, req, res, next) {
  // Default
  let statusCode = err.statusCode || 500;
  let message = err.message || "Server error";
  let details = err.details || null;

  // Multer errors (image upload)
  if (err instanceof multer.MulterError) {
    statusCode = 400;

    if (err.code === "LIMIT_FILE_SIZE") {
      message = "Image is too large (max 5MB)";
    } else {
      message = "File upload error";
    }

    details = {
      errors: [{ field: "image", message }],
    };
  }

  // Multer fileFilter custom error (from upload.js)
  if (err && typeof err.message === "string" && err.message.includes("Only PNG, JPG")) {
    statusCode = 400;
    message = err.message;
    details = {
      errors: [{ field: "image", message }],
    };
  }

  // If it's not HttpError and is 500 -> do not leak details
  if (!(err instanceof HttpError) && statusCode === 500) {
    details = null;
  }

  const body = { success: false, message };
  if (details) body.data = details;
  return res.status(statusCode).json(body);
}

module.exports = { errorHandler };
