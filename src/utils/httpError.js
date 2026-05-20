class HttpError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.details = details; // e.g. { errors: [...] }
  }
}

module.exports = { HttpError };
