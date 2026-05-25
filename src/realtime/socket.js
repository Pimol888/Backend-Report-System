const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const { config } = require("../config/env");
const { ROOMS } = require("./events");

let ioInstance = null;

function getTokenFromHandshake(socket) {
  const auth = socket.handshake.auth || {};
  if (auth.token) return auth.token;
  const query = socket.handshake.query || {};
  if (query.token) return Array.isArray(query.token) ? query.token[0] : query.token;
  const header = socket.handshake.headers?.authorization || "";
  const [type, token] = header.split(" ");
  if (type === "Bearer" && token) return token;
  return null;
}

function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch {
    return null;
  }
}

function joinRoomsForUser(socket, payload) {
  const userId = String(payload.sub || payload.id || "");
  if (!userId) return;
  socket.data.user = {
    id: userId,
    role: payload.role,
    name: payload.name,
    departmentId: payload.departmentId || null,
  };

  socket.join(ROOMS.user(userId));

  if (payload.role === "admin" || payload.role === "superadmin") {
    socket.join(ROOMS.admins());
  }
  if (payload.role === "superadmin") {
    socket.join(ROOMS.superadmins());
  }
  if (payload.departmentId) {
    socket.join(ROOMS.department(payload.departmentId));
  }
}

function initSocket(server) {
  ioInstance = new Server(server, {
    cors: { origin: "*", credentials: true },
    path: "/socket.io",
  });

  ioInstance.use((socket, next) => {
    const token = getTokenFromHandshake(socket);
    if (!token) {
      return next(new Error("Missing auth token"));
    }
    const payload = verifyToken(token);
    if (!payload) {
      return next(new Error("Invalid or expired token"));
    }
    socket.data.payload = payload;
    next();
  });

  ioInstance.on("connection", (socket) => {
    joinRoomsForUser(socket, socket.data.payload);
    socket.emit("connected", { ok: true, user: socket.data.user });

    socket.on("ping", (cb) => {
      if (typeof cb === "function") cb({ ok: true, ts: Date.now() });
    });
  });

  return ioInstance;
}

function getIO() {
  return ioInstance;
}

function emitToRooms(rooms, event, payload) {
  if (!ioInstance || !rooms?.length) return;
  ioInstance.to(rooms).emit(event, payload);
}

module.exports = { emitToRooms, getIO, initSocket };
