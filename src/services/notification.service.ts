import { Server } from "socket.io";
import prisma from "../config/prisma.js";

let io: Server | null = null;

export const setSocketServer = (server: Server) => {
  io = server;
};

export const NotificationService = {
  /**
   * 🔔 Core Notification Logic
   * 1. Saves to DB (for persistent "Inbox")
   * 2. Emits via Socket (for real-time "Toast")
   */
  async notify(userId: string, data: { 
    type: string; 
    message: string; 
    metadata?: any; 
    workspaceId: string 
  }) {
    try {
      // 1. Persist to Database
      const notification = await prisma.notification.create({
        data: {
          userId,
          workspaceId: data.workspaceId,
          type: data.type,
          message: data.message,
          metadata: data.metadata || {},
        },
      });

      // 2. Real-time emit if user is online
      if (io) {
        io.to(`user:${userId}`).emit("notification:new", notification);
      }
      
      return notification;
    } catch (error) {
      console.error("Failed to send notification:", error);
      // We don't throw here to prevent breaking the main Task/Deal flow
    }
  },

  // ================= SPECIFIC TRIGGERS =================

  async notifyTaskAssigned(assigneeId: string, task: any, workspaceId: string) {
    return this.notify(assigneeId, {
      workspaceId,
      type: "TASK_ASSIGNED",
      message: `You have been assigned to: ${task.title}`,
      metadata: { taskId: task.id, projectId: task.projectId },
    });
  },

  async notifyStatusBlocked(userId: string, task: any, workspaceId: string) {
    return this.notify(userId, {
      workspaceId,
      type: "TASK_BLOCKED",
      message: `Task "${task.title}" is blocked by unfinished dependencies.`,
      metadata: { taskId: task.id },
    });
  },

  async notifyDealWon(ownerId: string, deal: any, workspaceId: string) {
    return this.notify(ownerId, {
      workspaceId,
      type: "DEAL_WON",
      message: `Congratulations! Deal "${deal.title}" is closed.`,
      metadata: { dealId: deal.id },
    });
  },
};
