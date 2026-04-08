// src/jobs/notification.queue.ts
import { Queue, Worker, Job } from "bullmq";
import { createBullConnection } from "../config/redis.js";
import { getIO }                from "../config/socketio.js";
import prisma               from "../config/prisma.js";

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
// createBullConnection() gives this Queue its own dedicated ioredis instance.
// ─────────────────────────────────────────────

export const notificationQueue = new Queue<NotificationJobData>("notification", {
  connection: createBullConnection(),
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 3000 }, // 3s, 6s, 12s, 24s, 48s
    removeOnComplete: { count: 100 },
    removeOnFail:     { count: 200 }, // consistent with email.queue.ts
  },
});

// ─────────────────────────────────────────────
// Worker
// Separate connection from the Queue — required by BullMQ.
// Shutdown is handled centrally in server.ts — not here.
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

        if (!task) return;

        // Emit to the workspace room — only the assignee's client
        // should act on this event (filter by assigneeId on the frontend)
        getIO().to(data.workspaceId).emit("task_assigned", {
          taskId:     data.taskId,
          assigneeId: data.assigneeId,
          taskTitle:  task.title,
        });
        break;
      }

      case "TASK_DUE_SOON": {
        const task = await prisma.task.findUnique({
          where:  { id: data.taskId },
          select: { title: true },
        });

        if (!task) return;

        getIO().to(data.assigneeId).emit("task_due_soon", {
          taskId:    data.taskId,
          taskTitle: task.title,
          dueDate:   data.dueDate,
        });
        break;
      }

      case "DEPENDENCY_ADDED": {
        getIO().to(data.workspaceId).emit("dependency_added", {
          taskId: data.taskId,
          userId: data.userId,
        });
        break;
      }

      case "TASK_COMPLETED": {
        getIO().to(data.workspaceId).emit("task_completed", {
          taskId: data.taskId,
        });
        break;
      }

      default: {
        // Exhaustiveness check — TypeScript errors at compile time
        // if a new type is added to NotificationJobData without a case here
        const _exhaustive: never = data;
        throw new Error(
          `Unhandled notification job type: ${(_exhaustive as { type: string }).type}`
        );
      }
    }
  },
  {
    connection:  createBullConnection(),
    concurrency: 10,
  }
);

notificationWorker.on("completed", (job) =>
  console.log(`Notification job ${job.id} completed [${job.data.type}]`)
);

notificationWorker.on("failed", (job, err) =>
  console.error(`Notification job ${job?.id} failed [${job?.data?.type}]:`, err.message)
);