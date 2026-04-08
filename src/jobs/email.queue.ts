// src/jobs/email.queue.ts
import { Queue, Worker, Job } from "bullmq";
import { createBullConnection } from "../config/redis.js";
import { EmailService }         from "../services/email.service.js";

// ─────────────────────────────────────────────
// Job payload types
// Discriminated union — TypeScript enforces exhaustive handling in the switch
// ─────────────────────────────────────────────

export type EmailJobData =
  | { type: "VERIFICATION";   email: string; token: string }
  | { type: "PASSWORD_RESET"; email: string; token: string }
  | { type: "WELCOME";        email: string; name: string  };

// ─────────────────────────────────────────────
// Queue
// createBullConnection() gives this Queue its own dedicated ioredis instance.
// ─────────────────────────────────────────────

export const emailQueue = new Queue<EmailJobData>("email", {
  connection: createBullConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 }, // 5s, 10s, 20s
    removeOnComplete: { count: 100 }, // keep last 100 completed for debugging
    removeOnFail:     { count: 200 }, // keep last 200 failed for alerting
  },
});

// ─────────────────────────────────────────────
// Worker
// Separate connection from the Queue — required by BullMQ.
// ─────────────────────────────────────────────

export const emailWorker = new Worker<EmailJobData>(
  "email",
  async (job: Job<EmailJobData>) => {
    const { data } = job;

    switch (data.type) {
      case "VERIFICATION":
        await EmailService.sendVerificationEmail(data.email, data.token);
        break;

      case "PASSWORD_RESET":
        await EmailService.sendResetPasswordEmail(data.email, data.token);
        break;

      case "WELCOME":
        await EmailService.sendWelcomeEmail(data.email, data.name);
        break;

      default: {
        // Exhaustiveness check — TypeScript errors at compile time
        // if a new type is added to EmailJobData without a case here
        const _exhaustive: never = data;
        throw new Error(
          `Unhandled email job type: ${(_exhaustive as { type: string }).type}`
        );
      }
    }
  },
  {
    connection:  createBullConnection(),
    concurrency: 5,
  }
);

emailWorker.on("completed", (job) =>
  console.log(`Email job ${job.id} completed [${job.data.type}]`)
);

emailWorker.on("failed", (job, err) =>
  console.error(`Email job ${job?.id} failed [${job?.data?.type}]:`, err.message)
);