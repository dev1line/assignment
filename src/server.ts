import "dotenv/config";
import http, { type Server } from "http";
import app from "./app";
import { sequelize } from "./container";
import { DEFAULT_PORT, DEFAULT_SHUTDOWN_TIMEOUT_MS } from "./config/constants";
import { logger } from "./logger";

const PORT = Number(process.env.PORT || String(DEFAULT_PORT));
const SHUTDOWN_TIMEOUT_MS = Number(
  process.env.SHUTDOWN_TIMEOUT_MS ?? String(DEFAULT_SHUTDOWN_TIMEOUT_MS),
);

let server: Server | undefined;
let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.warn({ signal }, "shutdown already in progress, forcing exit");
    process.exit(1);
  }
  isShuttingDown = true;
  logger.info({ signal }, "graceful shutdown started");

  const forceTimer = setTimeout(() => {
    logger.error({ ms: SHUTDOWN_TIMEOUT_MS }, "shutdown timeout exceeded, forcing exit");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceTimer.unref();

  const finish = (code: number): void => {
    clearTimeout(forceTimer);
    process.exit(code);
  };

  const closeDb = (): void => {
    sequelize
      .close()
      .then(() => {
        logger.info("database connection closed");
        finish(0);
      })
      .catch((err: unknown) => {
        logger.error({ err }, "error closing database");
        finish(1);
      });
  };

  if (server) {
    server.close((err) => {
      if (err) {
        logger.error({ err }, "error closing HTTP server");
      } else {
        logger.info("HTTP server closed");
      }
      closeDb();
    });
  } else {
    closeDb();
  }
}

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});
process.once("SIGINT", () => {
  void shutdown("SIGINT");
});

async function start(): Promise<void> {
  try {
    await sequelize.authenticate();
    logger.info("database connection established");

    // Avoid Express `app.listen`: it registers the same callback for `error`, so on EADDRINUSE
    // the callback still runs and would falsely log "server listening".
    const httpServer = http.createServer(app);
    server = httpServer;
    httpServer.once("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        logger.error(
          { err, port: PORT },
          `Port ${PORT} is already in use. Set PORT in .env to a free port, or stop the other process (e.g. Docker, or check with: lsof -i :${PORT}).`,
        );
      } else {
        logger.error({ err, port: PORT }, "HTTP server failed to start (listen error)");
      }
      process.exit(1);
    });
    // Fargate/ALB health checks use IPv4; default listen() can be IPv6-only on some Linux images.
    httpServer.listen({ port: PORT, host: "0.0.0.0" }, () => {
      logger.info({ port: PORT }, "server listening");
    });
    httpServer.ref();
  } catch (error) {
    logger.error({ err: error }, "unable to start server");
    process.exit(1);
  }
}

void start().catch((error: unknown) => {
  logger.error({ err: error }, "fatal: server start failed");
  process.exit(1);
});
