import { Server } from "socket.io";
import prisma from "../config/prisma.js";
import { Notification } from "@prisma/client";

let io: Server | null = null;

/**
 * 🔥 Inject the Socket.io instance from your server entry point
 */
export const setSocketServer = (server: Server) => {
  io = server;
};

export const NotificationService = {
  /**
   * 🔔 Core Notification Logic (Production Ready)
   * Saves to DB and emits via Socket.io
   */
  async notify(userId: string, data: { 
    type: string; 
    message: string; 
    metadata?: any; 
    workspaceId: string 
  }): Promise<Notification | undefined> {
    try {
      // 1. Persist to DB (using the optimized schema)
      const notification = await prisma.notification.create({
        data: {
          userId,
          workspaceId: data.workspaceId,
          type: data.type,
          message: data.message,
          metadata: data.metadata || {},
        },
      });

      // 2. Emit Real-time (if user is online)
      if (io) {
        io.to(`user:${userId}`).emit("notification:new", notification);
      }
      
      return notification;
    } catch (error) {
      console.error("[NotificationService] Create Error:", error);
    }
  },

  // ================= UTILITIES & MANAGEMENT =================

  /**
   * ✅ Mark a single notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId, deletedAt: null },
      data: { isRead: true },
    });
  },

  /**
   * 🧹 Mark all for a specific workspace as read (Batch Update)
   */
  async markAllAsRead(userId: string, workspaceId: string) {
    return prisma.notification.updateMany({
      where: { userId, workspaceId, isRead: false, deletedAt: null },
      data: { isRead: true },
    });
  },

  /**
   * 🗑️ Soft Delete (Matches your optimized index)
   */
  async softDelete(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { deletedAt: new Date() },
    });
  },

  /**
   * 🔢 Get Unread Count (Optimized by your compound index)
   */
  async getUnreadCount(userId: string, workspaceId: string) {
    return prisma.notification.count({
      where: { userId, workspaceId, isRead: false, deletedAt: null },
    });
  },

  // ================= SPECIFIC BUSINESS TRIGGERS =================

  async notifyTaskAssigned(assigneeId: string, task: { id: string, title: string }, workspaceId: string) {
    return this.notify(assigneeId, {
      workspaceId,
      type: "TASK_ASSIGNED",
      message: `You have been assigned: ${task.title}`,
      metadata: { taskId: task.id },
    });
  },

  async notifyDealWon(ownerId: string, deal: { id: string, title: string }, workspaceId: string) {
    return this.notify(ownerId, {
      workspaceId,
      type: "DEAL_WON",
      message: `Big win! Deal "${deal.title}" is closed.`,
      metadata: { dealId: deal.id },
    });
  },
};
