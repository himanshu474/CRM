import prisma from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";

export const ActivityService = {
  // Get logs for a specific Task (Timeline)
  async getTaskLogs(workspaceId: string, taskId: string, query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    // Check if task exists and belongs to workspace
    const task = await prisma.task.findFirst({
      where: { id: taskId, workspaceId, deletedAt: null },
    });
    if (!task) throw new AppError("Task not found", 404);

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: { workspaceId, taskId },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.activityLog.count({ where: { workspaceId, taskId } }),
    ]);

    return { 
      data: logs, 
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } 
    };
  },

  // Get logs for the entire Workspace (Admin Activity Feed)
  async getWorkspaceLogs(workspaceId: string, query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const whereClause = {
      workspaceId,
      ...(query.action && { action: query.action }),
      ...(query.userId && { userId: query.userId }),
      ...(query.taskId && { taskId: query.taskId }),
    };

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: whereClause,
        include: {
          user: { select: { id: true, name: true } },
          task: { select: { id: true, title: true } }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.activityLog.count({ where: whereClause }),
    ]);

    return { 
      data: logs, 
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } 
    };
  },
};
