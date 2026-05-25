require("dotenv").config();

const http = require("http");
const { createApp } = require("./app");
const { bootstrap } = require("./bootstrap");
const { config } = require("./config/env");
const { initSocket } = require("./realtime/socket");

function listenWithRetry({ server, host, port, maxTries }) {
  return new Promise((resolve, reject) => {
    const tryListen = (p, remaining) => {
      const onListening = () => {
        server.off("error", onError);
        // eslint-disable-next-line no-console
        console.log(`OCM Report System API listening on http://${host}:${p}`);
        // eslint-disable-next-line no-console
        console.log(`Socket.IO endpoint:           ws://${host}:${p}/socket.io`);
        resolve({ server, port: p });
      };

      const onError = (err) => {
        server.off("listening", onListening);
        if (err && err.code === "EADDRINUSE" && remaining > 0) {
          // eslint-disable-next-line no-console
          console.warn(`Port ${p} in use, trying ${p + 1}...`);
          try {
            server.close(() => tryListen(p + 1, remaining - 1));
          } catch {
            tryListen(p + 1, remaining - 1);
          }
          return;
        }
        if (err && err.code === "EPERM") {
          return reject(
            new Error(`Permission denied listening on ${host}:${p}. Try HOST=127.0.0.1 and a different PORT.`),
          );
        }
        return reject(err);
      };

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
  const io = initSocket(server);
  app.set("io", io);

  await listenWithRetry({ server, host: config.host, port: config.port, maxTries: 10 });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
