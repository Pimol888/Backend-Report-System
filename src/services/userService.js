const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { nanoid } = require("nanoid");

const { getDb, updateDb } = require("../db");
const { config } = require("../config/env");
const { HttpError } = require("../utils/httpError");
const { sendPasswordResetEmail, isEmailConfigured } = require("./emailService");

/** Default password for new users; if used at login, force change is required (user role only). */
const DEFAULT_USER_PASSWORD = "OCM@123!";

function generateResetCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function signUserToken(user) {
  const options = config.jwtExpiresIn ? { expiresIn: config.jwtExpiresIn } : {};
  return jwt.sign(
    { sub: user.id, username: user.username, email: user.email ?? null, role: "user" },
    config.jwtSecret,
    options
  );
}

async function registerUser({ username, password, email }) {
  const db = await getDb();
  if (!Array.isArray(db.users)) db.users = [];

  const usernameTaken = db.users.some((u) => u.username.toLowerCase() === username.toLowerCase());
  if (usernameTaken) throw new HttpError(409, "Username already taken");

  if (email) {
    const emailTaken = db.users.some((u) => u.email && u.email.toLowerCase() === email.toLowerCase());
    if (emailTaken) throw new HttpError(409, "Email already taken");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const isDefaultPassword = password === DEFAULT_USER_PASSWORD;
  const user = {
    id: nanoid(),
    username,
    email: email || null,
    passwordHash,
    isDefaultPassword: !!isDefaultPassword,
    createdAt: new Date().toISOString(),
  };

  await updateDb(async (d) => {
    if (!Array.isArray(d.users)) d.users = [];
    d.users.push(user);
  });

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: "user",
      createdAt: user.createdAt,
      isDefaultPassword: user.isDefaultPassword,
    },
  };
}

async function loginUser({ username, password }) {
  const db = await getDb();
  const name = (username && String(username).trim()) || "";
  const user = (db.users || []).find((u) => (u.username || "").toLowerCase() === name.toLowerCase());
  if (!user) throw new HttpError(401, "Invalid credentials");

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new HttpError(401, "Invalid credentials");

  const token = signUserToken(user);
  // Prompt when DB flag is set or when they used the default password (covers old accounts)
  const isDefaultPassword = user.isDefaultPassword === true || password === DEFAULT_USER_PASSWORD;
  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email ?? null,
      role: "user",
      isDefaultPassword: !!isDefaultPassword,
    },
  };
}

async function requestUserPasswordReset({ username }) {
  const db = await getDb();
  const name = (username && String(username).trim()) || "";
  const user = (db.users || []).find((u) => (u.username || "").toLowerCase() === name.toLowerCase());
  if (!user) throw new HttpError(404, "No user found with that username");

  const email = user.email && String(user.email).trim();
  if (!email) throw new HttpError(400, "No email on file for this account. Contact support to add an email.");

  const code = generateResetCode();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  await updateDb(async (d) => {
    if (!Array.isArray(d.userResetTokens)) d.userResetTokens = [];
    // Ensure token is stored as a string
    d.userResetTokens.push({ 
      token: String(code).trim(), 
      userId: user.id, 
      expiresAt 
    });
  });

  if (!isEmailConfigured()) {
    throw new HttpError(503, "Password reset by email is not configured. Contact support.");
  }
  try {
    await sendPasswordResetEmail(email, code, config.resetTokenExpiresIn);
  } catch (err) {
    throw new HttpError(502, "Failed to send email. Please try again later.");
  }
  return { ok: true, expiresIn: config.resetTokenExpiresIn };
}

async function resetUserPassword({ code, newPassword }) {
  const codeStr = code !== undefined && code !== null ? String(code).trim() : "";
  if (!/^\d{6}$/.test(codeStr)) throw new HttpError(400, "Reset code must be a 6-digit number");
  if (typeof newPassword !== "string" || newPassword.length < 6) {
    throw new HttpError(400, "Password must be at least 6 characters");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await updateDb(async (db) => {
    if (!Array.isArray(db.userResetTokens)) db.userResetTokens = [];
    const now = new Date();
    
    // Find the token first (before filtering, to avoid race conditions)
    const normalizedCode = codeStr;
    let foundToken = null;
    let foundIdx = -1;
    
    for (let i = 0; i < db.userResetTokens.length; i++) {
      const token = db.userResetTokens[i];
      const storedToken = String(token.token || "").trim();
      const expiresAt = token.expiresAt ? new Date(token.expiresAt) : null;
      
      if (storedToken === normalizedCode) {
        if (!expiresAt || expiresAt <= now) {
          // Token found but expired
          throw new HttpError(400, "Reset code has expired. Please request a new code.");
        }
        foundToken = token;
        foundIdx = i;
        break;
      }
    }
    
    if (!foundToken) {
      throw new HttpError(400, "Invalid reset code. Please check the code and try again.");
    }

    const userId = foundToken.userId;
    db.userResetTokens.splice(foundIdx, 1);
    
    // Clean up other expired tokens
    db.userResetTokens = db.userResetTokens.filter(
      (r) => r.expiresAt && new Date(r.expiresAt) > now
    );

    const user = (db.users || []).find((u) => u.id === userId);
    if (!user) throw new HttpError(404, "User not found");
    user.passwordHash = passwordHash;
  });

  return { ok: true };
}

/**
 * Force change password (user only). Requires current password; sets isDefaultPassword = false.
 * New password must not be DEFAULT_USER_PASSWORD and must meet length requirement.
 */
async function forceChangePassword(userId, { currentPassword, newPassword }) {
  const db = await getDb();
  const user = (db.users || []).find((u) => u.id === userId);
  if (!user) throw new HttpError(404, "User not found");

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw new HttpError(400, "Current password is incorrect");

  if (newPassword === DEFAULT_USER_PASSWORD) {
    throw new HttpError(400, "New password cannot be the default password. Please choose a different password.");
  }
  if (typeof newPassword !== "string" || newPassword.length < 6) {
    throw new HttpError(400, "New password must be at least 6 characters");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await updateDb(async (d) => {
    const u = (d.users || []).find((x) => x.id === userId);
    if (u) {
      u.passwordHash = passwordHash;
      u.isDefaultPassword = false;
    }
  });

  return { ok: true };
}

module.exports = {
  registerUser,
  loginUser,
  signUserToken,
  requestUserPasswordReset,
  resetUserPassword,
  forceChangePassword,
  DEFAULT_USER_PASSWORD,
};

