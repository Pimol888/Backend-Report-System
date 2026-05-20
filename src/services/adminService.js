const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { nanoid } = require("nanoid");

const { getDb, updateDb } = require("../db");
const { config } = require("../config/env");
const { HttpError } = require("../utils/httpError");
const { sendPasswordResetEmail, isEmailConfigured } = require("./emailService");

/** Same default as users; if used at login, force change is required for admin/super_admin too. */
const DEFAULT_PASSWORD = "OCM@123!";

/** Generate 6-digit numeric reset code (e.g. 847291) */
function generateResetCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function signAdminToken(admin) {
  const role = admin.role === "super_admin" ? "super_admin" : "admin";
  const options = config.jwtExpiresIn ? { expiresIn: config.jwtExpiresIn } : {};
  return jwt.sign(
    { sub: admin.id, username: admin.username, email: admin.email ?? null, role },
    config.jwtSecret,
    options
  );
}

async function seedAdminIfNeeded() {
  const existing = await getDb();
  if (existing.admins.length > 0) {
    if (config.adminEmail) {
      await updateDb(async (db) => {
        const admin = (db.admins || []).find((a) => a.username === config.adminUsername);
        if (admin && !(admin.email && admin.email.trim())) {
          admin.email = config.adminEmail;
        }
      });
    }
    return;
  }

  await updateDb(async (db) => {
    if (db.admins.length > 0) return;
    const passwordHash = await bcrypt.hash(config.adminPassword, 10);
    db.admins.push({
      id: nanoid(),
      username: config.adminUsername,
      email: config.adminEmail || null,
      passwordHash,
      role: "admin",
      createdAt: new Date().toISOString(),
    });
  });
}

async function loginAdmin({ username, password }) {
  const db = await getDb();
  const name = (username && String(username).trim()) || "";
  const admin = db.admins.find((a) => (a.username || "").toLowerCase() === name.toLowerCase());
  if (!admin) throw new HttpError(401, "Invalid credentials");

  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) throw new HttpError(401, "Invalid credentials");

  const role = admin.role === "super_admin" ? "super_admin" : "admin";
  // Prompt to change when DB flag is set or when they literally used the default password (covers old accounts)
  const requirePasswordChange = admin.isDefaultPassword === true || password === DEFAULT_PASSWORD;
  return {
    token: signAdminToken(admin),
    admin: {
      id: admin.id,
      username: admin.username,
      email: admin.email ?? null,
      role,
      requirePasswordChange: !!requirePasswordChange,
    },
  };
}

/**
 * Register a new admin or super_admin. Username must be unique. Email optional.
 */
async function registerAdmin({ username, password, email, role: roleInput }) {
  const db = await getDb();
  if (!Array.isArray(db.admins)) db.admins = [];
  const exists = db.admins.some((a) => a.username.toLowerCase() === username.toLowerCase());
  if (exists) throw new HttpError(409, "Username already taken");
  if (email) {
    const emailTaken = db.admins.some(
      (a) => a.email && a.email.toLowerCase() === email.toLowerCase()
    );
    if (emailTaken) throw new HttpError(409, "Email already taken");
  }

  const role = roleInput === "super_admin" ? "super_admin" : "admin";
  const passwordHash = await bcrypt.hash(password, 10);
  const isDefaultPassword = password === DEFAULT_PASSWORD;
  const admin = {
    id: nanoid(),
    username,
    email: email || null,
    passwordHash,
    role,
    isDefaultPassword: !!isDefaultPassword,
    createdAt: new Date().toISOString(),
  };

  await updateDb(async (d) => {
    if (!Array.isArray(d.admins)) d.admins = [];
    d.admins.push(admin);
  });

  return {
    admin: { id: admin.id, username: admin.username, email: admin.email, role: admin.role, createdAt: admin.createdAt },
  };
}

/**
 * Forgot password: create a one-time 6-digit numeric reset code for the admin (by username).
 * User enters this code in reset-password to set a new password.
 */
async function requestPasswordReset({ username }) {
  const db = await getDb();
  if (!Array.isArray(db.admins)) throw new HttpError(500, "Admins not initialized");
  const name = (username && String(username).trim()) || "";
  const admin = db.admins.find((a) => (a.username || "").toLowerCase() === name.toLowerCase());
  if (!admin) throw new HttpError(404, "No admin found with that username");

  const email = admin.email && String(admin.email).trim();
  if (!email) throw new HttpError(400, "No email on file for this account. Contact support to add an email.");

  const code = generateResetCode();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
  const tokenToStore = String(code).trim();

  // Save token first, before sending email
  await updateDb(async (d) => {
    if (!Array.isArray(d.adminResetTokens)) d.adminResetTokens = [];
    // Ensure token is stored as a string
    d.adminResetTokens.push({ 
      token: tokenToStore, 
      adminId: String(admin.id), 
      expiresAt 
    });
  });

  if (!isEmailConfigured()) {
    throw new HttpError(503, "Password reset by email is not configured. Contact support.");
  }
  try {
    await sendPasswordResetEmail(email, tokenToStore, config.resetTokenExpiresIn);
  } catch (err) {
    // If email fails, remove the token we just created
    await updateDb(async (d) => {
      if (Array.isArray(d.adminResetTokens)) {
        d.adminResetTokens = d.adminResetTokens.filter(
          (t) => t.token !== tokenToStore || t.adminId !== String(admin.id)
        );
      }
    });
    throw new HttpError(502, "Failed to send email. Please try again later.");
  }
  return { ok: true, expiresIn: config.resetTokenExpiresIn };
}

/**
 * Reset password: validate 6-digit code and set new password.
 */
async function resetPassword({ code, newPassword }) {
  const codeStr = code !== undefined && code !== null ? String(code).trim() : "";
  if (codeStr.length < 6 || !/^\d{6}$/.test(codeStr)) {
    throw new HttpError(400, "Reset code must be a 6-digit number");
  }
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
    throw new HttpError(400, "Password must be at least 6 characters");
  }

  let adminId = null;
  await updateDb(async (db) => {
    if (!Array.isArray(db.adminResetTokens)) db.adminResetTokens = [];
    const now = new Date();
    
    // Find the token first (before filtering, to avoid race conditions)
    const normalizedCode = codeStr.trim();
    let foundToken = null;
    let foundIdx = -1;
    
    for (let i = 0; i < db.adminResetTokens.length; i++) {
      const token = db.adminResetTokens[i];
      if (!token || typeof token !== 'object') continue;
      
      const storedToken = String(token.token || "").trim();
      const expiresAt = token.expiresAt ? new Date(token.expiresAt) : null;
      
      // Exact string match
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
    
    adminId = foundToken.adminId;
    db.adminResetTokens.splice(foundIdx, 1);
    
    // Clean up other expired tokens
    db.adminResetTokens = db.adminResetTokens.filter(
      (r) => r.expiresAt && new Date(r.expiresAt) > now
    );
  });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await updateDb(async (db) => {
    const admin = (db.admins || []).find((a) => a.id === adminId);
    if (!admin) throw new HttpError(404, "Admin not found");
    admin.passwordHash = passwordHash;
  });

  return { ok: true };
}

/**
 * Force change password for admin/super_admin (e.g. after login with default password).
 * Verifies current password; sets new password and isDefaultPassword = false.
 */
async function forceChangePassword(adminId, { currentPassword, newPassword }) {
  const db = await getDb();
  const admin = (db.admins || []).find((a) => a.id === adminId);
  if (!admin) throw new HttpError(404, "Admin not found");

  const ok = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!ok) throw new HttpError(400, "Current password is incorrect");

  if (newPassword === DEFAULT_PASSWORD) {
    throw new HttpError(400, "New password cannot be the default password. Please choose a different password.");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await updateDb(async (d) => {
    const a = (d.admins || []).find((x) => x.id === adminId);
    if (a) {
      a.passwordHash = passwordHash;
      a.isDefaultPassword = false;
    }
  });
  return { ok: true };
}

/**
 * List admins for assignment (id + username only). Only role "admin" — exclude super_admin.
 * Any authenticated admin can fetch.
 */
async function listStaffForAssignment() {
  const db = await getDb();
  const admins = Array.isArray(db.admins) ? db.admins : [];
  return admins
    .filter((a) => a.role !== "super_admin")
    .map((a) => ({ id: a.id, username: a.username }));
}

module.exports = {
  seedAdminIfNeeded,
  loginAdmin,
  registerAdmin,
  signAdminToken,
  requestPasswordReset,
  resetPassword,
  forceChangePassword,
  listStaffForAssignment,
};

