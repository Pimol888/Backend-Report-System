const jwt = require("jsonwebtoken");
const { randomUUID } = require("node:crypto");
const { config } = require("../config/env");
const { HttpError } = require("../utils/httpError");
const userModel = require("../models/user.model");
const { DEPARTMENTS, TEAM_MEMBERS } = require("../db/seedData");

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    departmentId: user.departmentId || null,
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
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn || "8h" },
  );
}

async function ensureUserForLogin(identifier) {
  const lookup = String(identifier || "").trim().toLowerCase();
  let user = await userModel.findByEmail(lookup);
  if (user) return user;
  if (!lookup || lookup === "admin" || lookup === "superadmin") return null;

  const member = TEAM_MEMBERS[Math.floor(Math.random() * TEAM_MEMBERS.length)];
  const departmentId = DEPARTMENTS[0]?.id || null;
  const dynamicUser = {
    id: `u-dynamic-${randomUUID()}`,
    email: lookup,
    password: "password",
    role: "user",
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
  if (user.password && String(user.password) !== String(password)) {
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
