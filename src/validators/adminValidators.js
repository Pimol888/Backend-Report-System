function validateAdminLogin(body) {
  const { username, password } = body || {};
  if (typeof username !== "string" || typeof password !== "string") {
    return { ok: false, error: "username and password are required" };
  }

  const u = username.trim();
  const p = password;
  if (u.length === 0 || p.length === 0) {
    return { ok: false, error: "username and password are required" };
  }

  return { ok: true, value: { username: u, password: p } };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateAdminRegister(body) {
  const { username, password, confirmPassword, email } = body || {};
  if (typeof username !== "string" || username.trim().length === 0) {
    return { ok: false, error: "username is required" };
  }
  const u = username.trim();
  if (u.length < 3) {
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
  let emailValue = null;
  if (email !== undefined && email !== null && email !== "") {
    const e = typeof email === "string" ? email.trim() : String(email).trim();
    if (e.length > 0) {
      if (!EMAIL_REGEX.test(e)) {
        return { ok: false, error: "email must be a valid email address" };
      }
      emailValue = e;
    }
  }
  return { ok: true, value: { username: u, password, email: emailValue } };
}

function validateForgotPassword(body) {
  const { username } = body || {};
  if (typeof username !== "string" || username.trim().length === 0) {
    return { ok: false, error: "username is required" };
  }
  return { ok: true, value: { username: username.trim() } };
}

function validateResetPassword(body) {
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

module.exports = {
  validateAdminLogin,
  validateAdminRegister,
  validateForgotPassword,
  validateResetPassword,
};

