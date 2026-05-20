function validateUserRegister(body) {
  const { username, password, confirmPassword, email, role } = body || {};

  if (typeof username !== "string" || username.trim().length < 3) {
    return { ok: false, error: "username must be at least 3 characters" };
  }
  if (typeof password !== "string" || password.length < 6) {
    return { ok: false, error: "password must be at least 6 characters" };
  }
  if (typeof confirmPassword !== "string") {
    return { ok: false, error: "confirmPassword is required" };
  }
  if (password !== confirmPassword) {
    return { ok: false, error: "password and confirmPassword do not match" };
  }

  const roleNorm = role === undefined || role === null || role === "" ? "user" : String(role).trim().toLowerCase();
  if (roleNorm !== "user" && roleNorm !== "admin" && roleNorm !== "super_admin") {
    return { ok: false, error: "role must be user, admin, or super_admin" };
  }

  let emailValue = null;
  if (email !== undefined && email !== null && String(email).trim().length > 0) {
    const e = String(email).trim();
    const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
    if (!okEmail) return { ok: false, error: "email must be a valid email address" };
    emailValue = e;
  }

  return {
    ok: true,
    value: {
      username: username.trim(),
      password,
      email: emailValue,
      role: roleNorm,
    },
  };
}

function validateUserLogin(body) {
  const { username, password } = body || {};
  if (typeof username !== "string" || typeof password !== "string") {
    return { ok: false, error: "username and password are required" };
  }
  const u = username.trim();
  if (u.length === 0 || password.length === 0) {
    return { ok: false, error: "username and password are required" };
  }
  return { ok: true, value: { username: u, password } };
}

function validateUserForgotPassword(body) {
  const { username } = body || {};
  if (typeof username !== "string" || username.trim().length === 0) {
    return { ok: false, error: "username is required" };
  }
  return { ok: true, value: { username: username.trim() } };
}

function validateUserResetPassword(body) {
  const { code, newPassword, confirmPassword } = body || {};
  const codeStr = code !== undefined && code !== null ? String(code).trim() : "";
  if (codeStr.length === 0) {
    return { ok: false, error: "code is required (6-digit number from forgot password)" };
  }
  if (!/^\d{6}$/.test(codeStr)) {
    return { ok: false, error: "code must be exactly 6 digits" };
  }
  if (typeof newPassword !== "string" || newPassword.length < 6) {
    return { ok: false, error: "newPassword must be at least 6 characters" };
  }
  if (typeof confirmPassword !== "string") {
    return { ok: false, error: "confirmPassword is required" };
  }
  if (newPassword !== confirmPassword) {
    return { ok: false, error: "newPassword and confirmPassword do not match" };
  }
  return { ok: true, value: { code: codeStr, newPassword } };
}

function validateForceChangePassword(body) {
  const { currentPassword, newPassword, confirmPassword } = body || {};
  if (typeof currentPassword !== "string" || currentPassword.length === 0) {
    return { ok: false, error: "Current password is required" };
  }
  if (typeof newPassword !== "string" || newPassword.length < 6) {
    return { ok: false, error: "New password must be at least 6 characters" };
  }
  if (typeof confirmPassword !== "string") {
    return { ok: false, error: "Confirm password is required" };
  }
  if (newPassword !== confirmPassword) {
    return { ok: false, error: "New password and confirm password do not match" };
  }
  return {
    ok: true,
    value: { currentPassword, newPassword, confirmPassword },
  };
}

module.exports = {
  validateUserRegister,
  validateUserLogin,
  validateUserForgotPassword,
  validateUserResetPassword,
  validateForceChangePassword,
};

