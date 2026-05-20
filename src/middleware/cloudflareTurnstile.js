const axios = require("axios");
const { config } = require("../config/env");
const { HttpError } = require("../utils/httpError");

/**
 * Verify a Cloudflare Turnstile token against Cloudflare API.
 * Returns the decoded response from Cloudflare.
 */
async function verifyTurnstileToken(token, remoteIp) {
  const secret = config.cloudflare.turnstileSecret;

  if (!secret) {
    throw new HttpError(500, "Cloudflare Turnstile secret is not configured");
  }

  try {
    const body = new URLSearchParams({
      secret,
      response: token,
    });

    if (remoteIp) {
      body.append("remoteip", remoteIp);
    }

    const response = await axios.post(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      body.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 5000,
      }
    );

    return response.data;
  } catch (err) {
    throw new HttpError(502, "Failed to verify with Cloudflare Turnstile");
  }
}

/**
 * Express middleware: validates Cloudflare Turnstile before continuing.
 *
 * Looks for token in:
 * - req.body.captchaToken          (current frontend implementation)
 * - req.body.turnstileToken
 * - req.body["cf-turnstile-response"]
 * - req.headers["x-turnstile-token"]
 *
 * If CF_TURNSTILE_ENABLED is not "true", middleware is a no-op.
 */
async function cloudflareTurnstileMiddleware(req, res, next) {
  try {
    // Skip if Cloudflare protection is disabled
    if (!config.cloudflare.enabled) {
      return next();
    }

    // Skip CAPTCHA for authenticated requests (optional auth middleware sets req.user)
    // This keeps server-to-server integrations (like Telegram bot using Bearer tokens)
    // working while still protecting public/guest submissions.
    if (req.user) {
      return next();
    }

    // Skip CAPTCHA for Telegram bot API token (shared secret)
    // Telegram bot uses Authorization: Bearer <TELEGRAM_API_TOKEN>
    const authHeader = String(req.headers.authorization || "");
    const [type, bearer] = authHeader.split(" ");
    if (
      type === "Bearer" &&
      bearer &&
      config.telegram?.apiToken &&
      bearer === config.telegram.apiToken
    ) {
      return next();
    }

    const body = req.body || {};
    const token =
      body.captchaToken ||
      body.turnstileToken ||
      body["cf-turnstile-response"] ||
      req.headers["x-turnstile-token"];

    if (!token) {
      throw new HttpError(400, "Missing Cloudflare verification token");
    }

    const result = await verifyTurnstileToken(token, req.ip);

    if (!result || !result.success) {
      throw new HttpError(400, "Cloudflare verification failed", {
        errors: result && result["error-codes"] ? result["error-codes"] : undefined,
      });
    }

    // Attach verification result in case handlers want to inspect it
    req.turnstile = result;

    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  cloudflareTurnstileMiddleware,
};

