import { Queue, Worker, Job } from "bullmq";
import { bullConnection } from "../config/redis.js";
import { EmailService } from "../services/email.service.js";

// ─────────────────────────────────────────────
// Job payload types
// ─────────────────────────────────────────────

export type EmailJobData =
  | { type: "VERIFICATION";    email: string; token: string }
  | { type: "PASSWORD_RESET";  email: string; token: string }
  | { type: "WELCOME";         email: string; name: string  };

// ─────────────────────────────────────────────
// Queue
// ─────────────────────────────────────────────

export const emailQueue = new Queue<EmailJobData>("email", {
  connection: bullConnection,
  defaultJobOptions: {
    attempts:    3,
    backoff: { type: "exponential", delay: 5000 }, // 5s, 10s, 20s
    removeOnComplete: { count: 100 },  // ✅ keep last 100 completed jobs for debugging
    removeOnFail:     { count: 200 },  // ✅ keep last 200 failed jobs for alerting
  },
});

// ─────────────────────────────────────────────
// Worker
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

      default:
        // ✅ Exhaustiveness check — TypeScript will error if a new type is added
        // but not handled here
        throw new Error(`Unhandled email job type: ${(data as any).type}`);
    }
  },
  {
    connection: bullConnection,
    concurrency: 5, // ✅ process up to 5 emails in parallel
  }
);

emailWorker.on("completed", (job) =>
  console.log(`✅ Email job ${job.id} completed [${job.data.type}]`)
);
emailWorker.on("failed", (job, err) =>
  console.error(`❌ Email job ${job?.id} failed [${job?.data?.type}]:`, err.message)
);