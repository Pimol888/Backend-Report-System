require("dotenv").config();

const http = require("http");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const { createApp } = require("./app");
const { bootstrap } = require("./bootstrap");
const { config } = require("./config/env");

function listenWithRetry({ server, app, host, port, maxTries }) {
  return new Promise((resolve, reject) => {
    const tryListen = (p, remaining) => {
      const onListening = () => {
        server.off("error", onError);
        // eslint-disable-next-line no-console
        console.log(`OCM Report System API listening on http://${host}:${p}`);
        resolve({ server, port: p });
      };

      const onError = (err) => {
        server.off("listening", onListening);
        if (err && err.code === "EADDRINUSE" && remaining > 0) {
          // eslint-disable-next-line no-console
          console.warn(`Port ${p} in use, trying ${p + 1}...`);
          // Ensure the server is not left in a half-open state before retrying
          try {
            server.close(() => tryListen(p + 1, remaining - 1));
          } catch {
            tryListen(p + 1, remaining - 1);
          }
          return;
        }
        if (err && err.code === "EPERM") {
          return reject(new Error(`Permission denied listening on ${host}:${p}. Try HOST=127.0.0.1 and a different PORT.`));
        }
        return reject(err);
      };

      // Use once/off so retries don't stack multiple listeners/log lines
      server.once("listening", onListening);
      server.once("error", onError);
      server.listen(p, host);
    };

    tryListen(port, maxTries);
  });
}

async function main() {
  await bootstrap();

  const app = createApp();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: "*" },
    path: "/socket.io",
  });
  app.set("io", io);

  // When admin connects with token, join their room for real-time notifications
  io.on("connection", (socket) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token) {
      try {
        const payload = jwt.verify(token, config.jwtSecret);
        if (payload.role === "admin" || payload.role === "superadmin") {
          const adminId = String(payload.sub ?? payload.id ?? "");
          if (adminId) {
            socket.join(`admin:${adminId}`);
            socket.join("admins");
          }
        }
      } catch {
        // Invalid/expired token - socket stays connected but won't receive admin notifications
      }
    }
  });

  const port = config.port;
  const host = config.host;

  await listenWithRetry({ server, app, host, port, maxTries: 10 });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

