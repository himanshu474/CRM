import prisma from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { TaskStatus, TaskPriority, Prisma } from "@prisma/client";
import { autoUnblockTasks } from "./task.utils.js";
import { logAuditEvent } from "../utils/security/audit.utils.js";

export const TaskService = {
  // 1️⃣ CREATE
  async create(userId: string, workspaceId: string, projectId: string, body: any) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId, deletedAt: null },
    });
    if (!project) throw new AppError("Project not found", 404);

    return prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          title: body.title,
          description: body.description || null,
          priority: (body.priority as TaskPriority) || "MEDIUM",
          status: (body.status as TaskStatus) || "TODO",
          workspaceId,
          projectId,
          assigneeId: body.assigneeId || null,
          creatorId: userId,
          dealId: body.dealId || null,
          contactId: body.contactId || null,
        },
      });

      await logAuditEvent({
        workspaceId, userId, taskId: task.id,
        action: "TASK_CREATED",
        metadata: { title: task.title },
      }, tx);

      return task;
    });
  },

  // 2️⃣ GET BY PROJECT (List View)
  async getByProject(workspaceId: string, projectId: string, query: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.TaskWhereInput = {
      workspaceId,
      projectId,
      deletedAt: null,
      project: { deletedAt: null }, // 🔥 Ensure parent project is active
      ...(query.status && { status: query.status as TaskStatus }),
      ...(query.priority && { priority: query.priority as TaskPriority }),
      ...(query.search && { title: { contains: query.search, mode: "insensitive" } }),
    };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          predecessors: { include: { predecessor: { select: { status: true } } } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.task.count({ where }),
    ]);

    const enriched = tasks.map((task) => ({
      ...task,
      isBlocked: task.predecessors.some(p => p.predecessor.status !== TaskStatus.COMPLETED),
    }));

    return { data: enriched, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  },

  // 3️⃣ GET SINGLE (Detail View)
  async getOne(taskId: string, workspaceId: string) {
    const task = await prisma.task.findFirst({
      where: { id: taskId, workspaceId, deletedAt: null },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true } },
        attachments: { where: { deletedAt: null } },
        predecessors: { include: { predecessor: { select: { status: true, title: true } } } },
        successors: { include: { successor: { select: { id: true, title: true, status: true } } } },
      },
    });

    if (!task) throw new AppError("Task not found", 404);

    const isBlocked = task.predecessors.some(p => p.predecessor.status !== TaskStatus.COMPLETED);
    return { ...task, isBlocked };
  },

  // 4️⃣ UPDATE DETAILS
  async update(taskId: string, workspaceId: string, userId: string, body: any) {
    const task = await prisma.task.findFirst({
      where: { id: taskId, workspaceId, deletedAt: null },
    });
    if (!task) throw new AppError("Task not found", 404);

    // Filter restricted fields
    const { title, description, priority, dueDate } = body;

    return prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: taskId },
        data: { title, description, priority, dueDate },
      });

      await logAuditEvent({
        workspaceId, userId, taskId,
        action: "TASK_UPDATED",
        metadata: { updatedFields: Object.keys({ title, description, priority, dueDate }).filter(k => body[k] !== undefined) },
      }, tx);

      return updated;
    });
  },

  // 5️⃣ CHANGE STATUS (Logic Fix)
  async changeStatus(taskId: string, workspaceId: string, userId: string, newStatus: TaskStatus) {
    const task = await prisma.task.findFirst({
      where: { id: taskId, workspaceId, deletedAt: null },
      include: { predecessors: { include: { predecessor: { select: { status: true } } } } },
    });

    if (!task) throw new AppError("Task not found", 404);

    if ((newStatus === "IN_PROGRESS" || newStatus === "COMPLETED") && 
        task.predecessors.some(p => p.predecessor.status !== "COMPLETED")) {
      throw new AppError("Task is blocked by unfinished dependencies", 400);
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: taskId },
        data: { 
          status: newStatus,
          completedAt: newStatus === "COMPLETED" ? new Date() : null // 🔥 Reset if moved back
        },
      });

      await logAuditEvent({
        workspaceId, userId, taskId,
        action: "STATUS_CHANGE",
        metadata: { from: task.status, to: newStatus },
      }, tx);

      if (newStatus === "COMPLETED") await autoUnblockTasks(tx, taskId);
      return updated;
    });
  },

  // 6️⃣ ASSIGN
  async assign(taskId: string, workspaceId: string, userId: string, assigneeId: string | null) {
    const task = await prisma.task.findFirst({ where: { id: taskId, workspaceId, deletedAt: null } });
    if (!task) throw new AppError("Task not found", 404);

    if (assigneeId) {
      const member = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: assigneeId } },
      });
      if (!member) throw new AppError("Assignee is not a member of this workspace", 400);
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({ where: { id: taskId }, data: { assigneeId } });
      await logAuditEvent({
        workspaceId, userId, taskId,
        action: "TASK_ASSIGNED",
        metadata: { assigneeId: assigneeId || "unassigned" },
      }, tx);
      return updated;
    });
  },

  // 7️⃣ MY TASKS (Dashboard)
  async getMyTasks(userId: string, workspaceId?: string, status?: TaskStatus, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const where: Prisma.TaskWhereInput = {
      assigneeId: userId,
      deletedAt: null,
      project: { deletedAt: null }, // 🔥 Ignore tasks in trashed projects
      ...(workspaceId && { workspaceId }),
      ...(status && { status })
    };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: { project: { select: { name: true } }, workspace: { select: { name: true } } },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip, take: limit
      }),
      prisma.task.count({ where })
    ]);

    return { tasks, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  },

  // 8️⃣ SOFT DELETE
  async delete(taskId: string, workspaceId: string, userId: string) {
    const task = await prisma.task.findFirst({ where: { id: taskId, workspaceId, deletedAt: null } });
    if (!task) throw new AppError("Task not found", 404);

    return prisma.$transaction(async (tx) => {
      await tx.task.update({ where: { id: taskId }, data: { deletedAt: new Date() } });
      await logAuditEvent({ workspaceId, userId, taskId, action: "DELETE_TASK" }, tx);
    });
  },
};
