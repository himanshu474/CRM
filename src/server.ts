// src/server.ts
import "dotenv/config";
import http                          from "http";
import app                           from "./app.js";
import { connectRedis, disconnectRedis } from "./config/redis.js";
import { connectEmail }              from "./config/email.js";
import prisma                     from "./config/prisma.js";
import { initSocket }                from "./config/socketio.js";
import { emailWorker, emailQueue }   from "./jobs/email.queue.js";
import { notificationWorker, notificationQueue } from "./jobs/notification.queue.js";
import * as Sentry from "@sentry/node";
import { registerCleanupJobs }                   from "./jobs/cleanup.job.js";


Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV });

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

// ─────────────────────────────────────────────
// Graceful shutdown
// All worker and queue close calls live here — not inside job files.
// ─────────────────────────────────────────────

const shutdown = async (signal: string): Promise<void> => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Stop accepting new HTTP requests
  server.close(async () => {
    try {
      // Close BullMQ workers first — let in-progress jobs finish
      await emailWorker.close();
      await notificationWorker.close();

      // Close queues
      await emailQueue.close();
      await notificationQueue.close();

      // Close database connection
      await prisma.$disconnect();

      // Close Redis connections last
      await disconnectRedis();

      console.log("Graceful shutdown complete.");
      process.exit(0);
    } catch (err) {
      console.error("Error during shutdown:", err);
      process.exit(1);
    }
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  shutdown("unhandledRejection");
});

// ─────────────────────────────────────────────
// Startup
// ─────────────────────────────────────────────

const start = async (): Promise<void> => {
  // Redis — required, abort on failure
  await connectRedis();

  // Email — non-critical, warn and continue if SMTP is unavailable at startup
  try {
    await connectEmail();
  } catch (err) {
    console.warn("Email service unavailable at startup. Will retry on first send.", err);
  }

  // Database connection check
  await prisma.$connect();
  console.log("Database: Connected");

  // Socket.io — must be initialised before queue workers start
  // so getIO() is available when the first notification job runs
  initSocket(server);
  console.log("Socket.io: Initialised");

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
        registerCleanupJobs(); // start cron jobs after server is ready
  });
};

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});