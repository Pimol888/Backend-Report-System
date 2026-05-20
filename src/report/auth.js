const jwt = require("jsonwebtoken");
const { randomUUID } = require("node:crypto");
const { config } = require("../config/env");
const { HttpError } = require("../utils/httpError");
const { getDb, updateDb } = require("./store");

async function ensureUserForLogin(identifier) {
  const db = await getDb();
  const lookup = String(identifier || "").trim().toLowerCase();
  let user = db.users.find((u) => String(u.email).toLowerCase() === lookup);
  if (user) return user;
  if (!lookup || lookup === "admin" || lookup === "superadmin") return null;

  user = await updateDb((state) => {
    const maybeExisting = state.users.find((u) => String(u.email).toLowerCase() === lookup);
    if (maybeExisting) return maybeExisting;
    const member = state.teamMembers[Math.floor(Math.random() * state.teamMembers.length)] || {
      id: "0",
      name: "លោក អ្នកប្រើប្រាស់",
      initials: "អ",
    };
    const departmentId = state.departments[0] ? state.departments[0].id : null;
    const dynamicUser = {
      id: `u-dynamic-${randomUUID()}`,
      email: lookup,
      password: "password",
      role: "user",
      name: member.name,
      departmentId,
      courtesyName: member.name.split(" ")[0] || "លោក",
      phone: "+855 12 000 000",
    };
    state.users.push(dynamicUser);
    return dynamicUser;
  });
  return user;
}

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
  const db = await getDb();
  const user = db.users.find((u) => u.id === userId);
  return user ? toPublicUser(user) : null;
}

module.exports = {
  getUserById,
  login,
};
