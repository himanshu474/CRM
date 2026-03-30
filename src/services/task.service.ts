import prisma from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { TaskStatus, TaskPriority, Prisma } from "@prisma/client";
import { autoUnblockTasks } from "./task.utils.js";
import { logAuditEvent } from "../utils/security/audit.utils.js";

export const TaskService = {

  // CREATE
  async create(userId: string, workspaceId: string, projectId: string, body: any) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId, deletedAt: null },
    });
    if (!project) throw new AppError("Project not found", 404);

    // Validate assignee BEFORE opening the transaction
    if (body.assigneeId) {
      const member = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: body.assigneeId } },
      });
      if (!member) throw new AppError("Assignee is not a member of this workspace", 400);
    }

    return prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          title:       body.title,
          description: body.description || null,
          priority:    (body.priority as TaskPriority) || TaskPriority.MEDIUM,
          status:      (body.status  as TaskStatus)    || TaskStatus.TODO,
          workspaceId,
          projectId,
          creatorId:   userId,                               //required field
          assigneeId:  body.assigneeId  || null,
          dealId:      body.dealId      || null,
          contactId:   body.contactId   || null,
          dueDate:     body.dueDate     ? new Date(body.dueDate) : null, // string → Date
          position:    body.position    ?? 0,                //new schema field
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

  // GET BY PROJECT (List View)
  async getByProject(workspaceId: string, projectId: string, query: any) {
    const page  = parseInt(query.page)  || 1;
    const limit = parseInt(query.limit) || 10;
    const skip  = (page - 1) * limit;

    const where: Prisma.TaskWhereInput = {
      workspaceId,
      projectId,
      deletedAt: null,
      project: { deletedAt: null },
      ...(query.status   && { status:   query.status   as TaskStatus }),
      ...(query.priority && { priority: query.priority as TaskPriority }),
      ...(query.search   && { title: { contains: query.search, mode: "insensitive" } }),
    };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          assignee:     { select: { id: true, name: true, email: true } },
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
      isBlocked: task.predecessors.some(
        (p) => p.predecessor.status !== TaskStatus.COMPLETED
      ),
    }));

    return {
      data: enriched,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  },

  //  GET SINGLE (Detail View)
  async getOne(taskId: string, workspaceId: string) {
    const task = await prisma.task.findFirst({
      where: { id: taskId, workspaceId, deletedAt: null },
      include: {
        project:      { select: { id: true, name: true } },
        assignee:     { select: { id: true, name: true, email: true } },
        creator:      { select: { id: true, name: true } },             // ✅ added: creatorId is now in schema
        deal:         { select: { id: true, title: true, status: true } }, // ✅ added: dealId in schema
        contact:      { select: { id: true, name: true, email: true } },   // ✅ added: contactId in schema
        attachments:  { where: { deletedAt: null } },
        predecessors: { include: { predecessor: { select: { id: true, title: true, status: true } } } },
        successors:   { include: { successor:   { select: { id: true, title: true, status: true } } } },
      },
    });

    if (!task) throw new AppError("Task not found", 404);

    const isBlocked = task.predecessors.some(
      (p) => p.predecessor.status !== TaskStatus.COMPLETED
    );
    return { ...task, isBlocked };
  },

  // UPDATE DETAILS
  async update(taskId: string, workspaceId: string, userId: string, body: any) {
    const task = await prisma.task.findFirst({
      where: { id: taskId, workspaceId, deletedAt: null },
    });
    if (!task) throw new AppError("Task not found", 404);

    const { title, description, priority, dueDate } = body;

    return prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: taskId },
        data: {
          title:       title       ?? undefined,
          description: description ?? undefined,
          priority:    (priority as TaskPriority) ?? undefined,
          dueDate:     dueDate ? new Date(dueDate) : undefined, // string → Date conversion
        },
      });

      const changedFields = (["title", "description", "priority", "dueDate"] as const)
        .filter((k) => body[k] !== undefined);

      await logAuditEvent({
        workspaceId, userId, taskId,
        action: "TASK_UPDATED",
        metadata: { updatedFields: changedFields },
      }, tx);

      return updated;
    });
  },

  // CHANGE STATUS
  async changeStatus(taskId: string, workspaceId: string, userId: string, newStatus: TaskStatus) {
    const task = await prisma.task.findFirst({
      where: { id: taskId, workspaceId, deletedAt: null },
      include: { predecessors: { include: { predecessor: { select: { status: true } } } } },
    });

    if (!task) throw new AppError("Task not found", 404);

    if (
      (newStatus === TaskStatus.IN_PROGRESS || newStatus === TaskStatus.COMPLETED) &&
      task.predecessors.some((p) => p.predecessor.status !== TaskStatus.COMPLETED)
    ) {
      throw new AppError("Task is blocked by unfinished dependencies", 400);
    }

    // Boundary-aware: only write completedAt when actually crossing the COMPLETED line
    const completedAt =
      newStatus === TaskStatus.COMPLETED && task.status !== TaskStatus.COMPLETED
        ? new Date()   // entering COMPLETED
        : newStatus !== TaskStatus.COMPLETED && task.status === TaskStatus.COMPLETED
        ? null         // leaving COMPLETED → clear
        : undefined;   // no boundary crossed → Prisma no-op

    return prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: taskId },
        data: { status: newStatus, completedAt },
      });

      await logAuditEvent({
        workspaceId, userId, taskId,
        action: "STATUS_CHANGE",
        metadata: { from: task.status, to: newStatus },
      }, tx);

      // Pass tx so unblocking runs in the same transaction as the status update
      if (newStatus === TaskStatus.COMPLETED) await autoUnblockTasks(tx, taskId);

      return updated;
    });
  },

  // ASSIGN
  async assign(taskId: string, workspaceId: string, userId: string, assigneeId: string | null) {
    const task = await prisma.task.findFirst({
      where: { id: taskId, workspaceId, deletedAt: null },
    });
    if (!task) throw new AppError("Task not found", 404);

    // Early exit — skip DB write + audit log if nothing changed
    if (task.assigneeId === (assigneeId || null)) return task;

    if (assigneeId) {
      const member = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: assigneeId } },
      });
      if (!member) throw new AppError("Assignee is not a member of this workspace", 400);
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: taskId },
        data:  { assigneeId },
      });

      await logAuditEvent({
        workspaceId, userId, taskId,
        action: "TASK_ASSIGNED",
        //Richer audit: log both from/to instead of just the new value
        metadata: {
          assigneeId: { from: task.assigneeId ?? "unassigned", to: assigneeId ?? "unassigned" },
        },
      }, tx);

      return updated;
    });
  },

  // MY TASKS (Dashboard)
  async getMyTasks(userId: string, workspaceId?: string, status?: TaskStatus, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const where: Prisma.TaskWhereInput = {
      assigneeId: userId,
      deletedAt:  null,
      project:    { deletedAt: null },
      ...(workspaceId && { workspaceId }),
      ...(status      && { status }),
    };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          project:   { select: { name: true } },
          workspace: { select: { name: true } },
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.task.count({ where }),
    ]);

    return { tasks, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  },

  // SOFT DELETE
  async delete(taskId: string, workspaceId: string, userId: string) {
    const task = await prisma.task.findFirst({
      where: { id: taskId, workspaceId, deletedAt: null },
    });
    if (!task) throw new AppError("Task not found", 404);

    return prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: taskId },
        data:  { deletedAt: new Date() },
      });

      // Added metadata so the audit trail includes the task title
      await logAuditEvent({
        workspaceId, userId, taskId,
        action: "DELETE_TASK",
        metadata: { title: task.title },
      }, tx);
    });
  },
};