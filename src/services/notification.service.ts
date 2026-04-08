// src/services/notification.service.ts — FIXED (removes setSocketServer bug)
import prisma              from "../config/prisma.js";
import { getIO }           from "../config/socketio.js";
import { Notification }    from "@prisma/client";

export const NotificationService = {

  async notify(
    userId: string,
    data: {
      type:        string;
      message:     string;
      metadata?:   Record<string, any>;
      workspaceId: string;
    }
  ): Promise<Notification | undefined> {
    // DB write always throws on failure — do not swallow it
    const notification = await prisma.notification.create({
      data: {
        userId,
        workspaceId: data.workspaceId,
        type:        data.type,
        message:     data.message,
        metadata:    data.metadata ?? {},
      },
    });

    // Socket emit is fire-and-forget — user may be offline
    try {
      getIO().to(`user:${userId}`).emit("notification:new", notification);
    } catch {
      // Socket not initialised or user offline — not a crash
    }

    return notification;
  },

  async markAsRead(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId, deletedAt: null },
      data:  { isRead: true },
    });
  },

  async markAllAsRead(userId: string, workspaceId: string) {
    return prisma.notification.updateMany({
      where: { userId, workspaceId, isRead: false, deletedAt: null },
      data:  { isRead: true },
    });
  },

  async softDelete(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data:  { deletedAt: new Date() },
    });
  },

  async getUnreadCount(userId: string, workspaceId: string) {
    return prisma.notification.count({
      where: { userId, workspaceId, isRead: false, deletedAt: null },
    });
  },

  async notifyTaskAssigned(
    assigneeId:  string,
    task:        { id: string; title: string },
    workspaceId: string
  ) {
    return this.notify(assigneeId, {
      workspaceId,
      type:     "TASK_ASSIGNED",
      message:  `You have been assigned: ${task.title}`,
      metadata: { taskId: task.id },
    });
  },

  async notifyDealWon(
    ownerId:     string,
    deal:        { id: string; title: string },
    workspaceId: string
  ) {
    return this.notify(ownerId, {
      workspaceId,
      type:     "DEAL_WON",
      message:  `Deal "${deal.title}" is closed — great work!`,
      metadata: { dealId: deal.id },
    });
  },
};