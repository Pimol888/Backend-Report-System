const { HttpError } = require("../utils/httpError");
const envModule = require("../config/env");
if (typeof envModule.getJwtExpiresInSeconds !== "function") {
  throw new Error("getJwtExpiresInSeconds is not exported correctly from config/env");
}
const getJwtExpiresInSeconds = envModule.getJwtExpiresInSeconds;
const {
  validateUserRegister,
  validateUserLogin,
  validateUserForgotPassword,
  validateUserResetPassword,
} = require("../validators/userValidators");
const {
  registerUser,
  loginUser,
  requestUserPasswordReset,
  resetUserPassword,
  forceChangePassword,
} = require("../services/userService");
const {
  registerAdmin,
  loginAdmin,
  requestPasswordReset: requestAdminPasswordReset,
  resetPassword: resetAdminPassword,
  forceChangePassword: forceChangePasswordAdmin,
} = require("../services/adminService");
const { validateForceChangePassword } = require("../validators/userValidators");

async function register(req, res) {
  const validation = validateUserRegister(req.body);
  if (!validation.ok) throw new HttpError(400, validation.error);

  const { role, ...payload } = validation.value;

  if (role === "admin" || role === "super_admin") {
    const { admin } = await registerAdmin({ ...payload, role });
    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: {
        user: {
          id: admin.id,
          name: admin.username,
          email: admin.email,
          role: admin.role,
          createdAt: admin.createdAt,
        },
      },
    });
  }

  const { user } = await registerUser(payload);
  return res.status(201).json({
    success: true,
    message: "Account created successfully",
    data: {
      user: {
        id: user.id,
        name: user.username,
        email: user.email,
        role: "user",
        createdAt: user.createdAt,
      },
    },
  });
}

async function login(req, res) {
  const validation = validateUserLogin(req.body);
  if (!validation.ok) throw new HttpError(400, validation.error);

  // Try user login first
  try {
    const { token, user } = await loginUser(validation.value);
    const requirePw = user.isDefaultPassword === true;
    return res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          name: user.username,
          email: user.email,
          role: "user",
          requirePasswordChange: requirePw,
          isDefaultPassword: requirePw,
        },
        accessToken: token,
        expiresIn: getJwtExpiresInSeconds(),
      },
    });
  } catch (err) {
    // If user login failed with Invalid credentials, try admin
    if (!(err instanceof HttpError) || err.statusCode !== 401) {
      throw err;
    }
  }

  // Try admin login
  const { token, admin } = await loginAdmin(validation.value);
  return res.json({
    success: true,
    message: "Login successful",
    data: {
      user: {
        id: admin.id,
        name: admin.username,
        email: admin.email ?? null,
        role: admin.role || "admin",
        requirePasswordChange: admin.requirePasswordChange === true,
      },
      accessToken: token,
      expiresIn: getJwtExpiresInSeconds(),
    },
  });
}

async function forgotPassword(req, res) {
  const validation = validateUserForgotPassword(req.body);
  if (!validation.ok) throw new HttpError(400, validation.error);

  // Try user first
  let result;
  try {
    result = await requestUserPasswordReset(validation.value);
  } catch (err) {
    if (!(err instanceof HttpError) || err.statusCode !== 404) {
      throw err;
    }
    // If no user found, try admin
    result = await requestAdminPasswordReset(validation.value);
  }

  return res.json({
    success: true,
    message: "If an account exists with that username, we sent a 6-digit code to the email on file. Use it in reset-password.",
    data: { expiresIn: result.expiresIn },
  });
}

async function resetPasswordHandler(req, res) {
  const validation = validateUserResetPassword(req.body);
  if (!validation.ok) throw new HttpError(400, validation.error);
  // Try admin reset first (admin login page uses this), then user
  try {
    await resetAdminPassword(validation.value);
  } catch (err) {
    if (!(err instanceof HttpError)) throw err;
    if (err.statusCode !== 400 && err.statusCode !== 404) throw err;
    await resetUserPassword(validation.value);
  }
  return res.json({ success: true, message: "Password reset successfully" });
}

async function forceChangePasswordHandler(req, res) {
  const validation = validateForceChangePassword(req.body);
  if (!validation.ok) throw new HttpError(400, validation.error);
  const userId = req.user?.sub ?? req.user?.id;
  if (!userId) throw new HttpError(401, "Authentication required");
  await forceChangePassword(userId, validation.value);
  return res.json({ success: true, message: "Password updated successfully. You can continue." });
}

async function forceChangePasswordAdminHandler(req, res) {
  const validation = validateForceChangePassword(req.body);
  if (!validation.ok) throw new HttpError(400, validation.error);
  const adminId = req.admin?.sub ?? req.admin?.id;
  if (!adminId) throw new HttpError(401, "Authentication required");
  await forceChangePasswordAdmin(adminId, validation.value);
  return res.json({ success: true, message: "Password updated successfully. You can continue." });
}

module.exports = {
  register,
  login,
  forgotPassword,
  resetPasswordHandler,
  forceChangePasswordHandler,
  forceChangePasswordAdminHandler,
};

