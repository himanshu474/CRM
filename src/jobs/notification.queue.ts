import { Queue, Worker, Job } from "bullmq";
import { bullConnection } from "../config/redis.js";
import prisma from "../config/prisma.js";

// ─────────────────────────────────────────────
// Job payload types
// ─────────────────────────────────────────────

export type NotificationJobData =
  | { type: "TASK_ASSIGNED";    taskId: string; assigneeId: string; workspaceId: string }
  | { type: "TASK_DUE_SOON";    taskId: string; assigneeId: string; dueDate: string     }
  | { type: "DEPENDENCY_ADDED"; taskId: string; userId: string;     workspaceId: string }
  | { type: "TASK_COMPLETED";   taskId: string; workspaceId: string                     };

// ─────────────────────────────────────────────
// Queue
// ─────────────────────────────────────────────

export const notificationQueue = new Queue<NotificationJobData>("notification", {
  connection: bullConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff:  { type: "exponential", delay: 3000 },
    removeOnComplete: { count: 100 },
    removeOnFail:     { count: 200 },
  },
});

// ─────────────────────────────────────────────
// Worker
// ─────────────────────────────────────────────

export const notificationWorker = new Worker<NotificationJobData>(
  "notification",
  async (job: Job<NotificationJobData>) => {
    const { data } = job;

    switch (data.type) {

      case "TASK_ASSIGNED": {
        const task = await prisma.task.findUnique({
          where:  { id: data.taskId },
          select: { title: true },
        });
        if (!task) break; // task may have been deleted — skip silently

        // TODO: push to in-app notification store / send email
        console.log(`🔔 Notify user ${data.assigneeId}: assigned to "${task.title}"`);
        break;
      }

      case "TASK_DUE_SOON": {
        const task = await prisma.task.findUnique({
          where:  { id: data.taskId },
          select: { title: true },
        });
        if (!task) break;

        console.log(
          `🔔 Notify user ${data.assigneeId}: "${task.title}" due ${data.dueDate}`
        );
        break;
      }

      case "DEPENDENCY_ADDED":
      case "TASK_COMPLETED": {
        // Placeholder — extend with real notification delivery
        console.log(`🔔 Notification queued: ${data.type} for task ${data.taskId}`);
        break;
      }

      default:
        throw new Error(`Unhandled notification type: ${(data as any).type}`);
    }
  },
  {
    connection:  bullConnection,
    concurrency: 10,
  }
);

notificationWorker.on("completed", (job) =>
  console.log(`✅ Notification job ${job.id} completed [${job.data.type}]`)
);
notificationWorker.on("failed", (job, err) =>
  console.error(`❌ Notification job ${job?.id} failed [${job?.data?.type}]:`, err.message)
);