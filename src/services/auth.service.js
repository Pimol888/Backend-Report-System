const jwt = require("jsonwebtoken");
const { randomUUID } = require("node:crypto");
const bcrypt = require("bcryptjs");
const { config } = require("../config/env");
const { HttpError } = require("../utils/httpError");
const userModel = require("../models/user.model");
const { ROLES } = require("../constants/roles");
const { DEPARTMENTS, TEAM_MEMBERS } = require("../db/seedData");

const RESERVED_LOGINS = new Set(["admin", "orgadmin", "superadmin"]);

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    departmentId: user.departmentId || null,
    generalDirectorateId: user.generalDirectorateId || null,
  };
}

function signUser(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      departmentId: user.departmentId || null,
      generalDirectorateId: user.generalDirectorateId || null,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn || "8h" },
  );
}

async function ensureUserForLogin(identifier) {
  const lookup = String(identifier || "").trim().toLowerCase();
  let user = await userModel.findByEmail(lookup);
  if (user) return user;
  if (!lookup || RESERVED_LOGINS.has(lookup)) return null;

  const member = TEAM_MEMBERS[Math.floor(Math.random() * TEAM_MEMBERS.length)];
  const departmentId = DEPARTMENTS[0]?.id || null;
  const dynamicUser = {
    id: `u-dynamic-${randomUUID()}`,
    email: lookup,
    password: await bcrypt.hash("password", 10),
    role: ROLES.USER,
    name: member.name,
    departmentId,
    courtesyName: member.name.split(" ")[0] || "លោក",
    phone: "+855 12 000 000",
    initials: member.initials,
  };
  await userModel.createUser(dynamicUser);
  return dynamicUser;
}

async function login(email, password) {
  const id = String(email || "").trim().toLowerCase();
  if (!id || !String(password || "").trim()) {
    throw new HttpError(400, "Email/username and password are required");
  }
  const user = await ensureUserForLogin(id);
  if (!user) throw new HttpError(401, "Invalid credentials");
  let ok = user.password ? await bcrypt.compare(String(password), String(user.password)) : false;
  if (!ok && user.password === String(password)) {
    ok = true;
    await userModel.updatePassword(user.id, await bcrypt.hash(String(password), 10));
  }
  if (!ok) {
    throw new HttpError(401, "Invalid credentials");
  }
  const token = signUser(user);
  return { token, user: toPublicUser(user), role: user.role };
}

async function getUserById(userId) {
  const user = await userModel.findById(userId);
  return user ? toPublicUser(user) : null;
}

module.exports = {
  getUserById,
  login,
};
