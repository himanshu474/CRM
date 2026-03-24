import prisma from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { WorkspaceRole } from "@prisma/client";
import { logAuditEvent } from "../utils/security/audit.utils.js";

export const ProjectService = {
  async create(workspaceId: string, userId: string, body: any) {
    const workspace = await prisma.workspace.findFirst({
      where: { id: workspaceId, deletedAt: null },
    });

    if (!workspace) throw new AppError("Workspace not found", 404);

    const project = await prisma.project.create({
      data: {
        name: body.name,
        description: body.description ?? null,
        workspaceId,
        ownerId: userId,
      },
    });

    await logAuditEvent({
      workspaceId,
      userId,
      action: "PROJECT_CREATED",
      metadata: { projectId: project.id, name: project.name },
    });

    return project;
  },

  async getAll(workspaceId: string) {
    return prisma.project.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
      },
    });
  },

  async update(workspaceId: string, projectId: string, body: any, userId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId, deletedAt: null },
    });

    if (!project) throw new AppError("Project not found", 404);

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        name: body.name ?? undefined,
        description: body.description ?? undefined,
      },
    });

    return updated;
  },

  async delete(workspaceId: string, projectId: string, userId: string) {
  // 1. Fetch project FIRST to verify ownership and get the name for the log
  const project = await prisma.project.findFirst({
    where: { 
      id: projectId, 
      workspaceId, 
      deletedAt: null 
    },
  });

  if (!project) throw new AppError("Project not found", 404);

  const now = new Date();

  // 2. Start the Interactive Transaction
  return await prisma.$transaction(async (tx) => {
    // Soft delete the Project
    const updated = await tx.project.update({
      where: { id: projectId },
      data: { deletedAt: now },
    });

    // Soft delete all Tasks belonging to this project & workspace
    await tx.task.updateMany({
      where: { 
        projectId, 
        workspaceId, 
        deletedAt: null 
      },
      data: { deletedAt: now },
    });

    // 3. Log the Audit Event (Passing 'tx' to keep it in the transaction)
    // Using the field names from your schema: workspaceId, userId, action, metadata
    await logAuditEvent({
      workspaceId,
      userId,
      action: "PROJECT_DELETED",
      metadata: { 
        projectId: project.id, 
        name: project.name,
        reason: "Manual deletion",
        field: "deletedAt",
        newValue: now.toISOString()
      },
    }, tx);

    return updated;
  });
},

 async restore(workspaceId: string, projectId: string, userId: string) {
  // 1. Verify project exists in this workspace before starting transaction
  const project = await prisma.project.findFirst({
    where: { 
      id: projectId, 
      workspaceId 
    },
  });

  if (!project) throw new AppError("Project not found or access denied", 404);

  // 2. Start Interactive Transaction
  return await prisma.$transaction(async (tx) => {
    // Restore the Project
    const restored = await tx.project.update({
      where: { id: projectId },
      data: { deletedAt: null },
    });

    // Restore associated tasks that were soft-deleted (deletedAt is not null)
    await tx.task.updateMany({
      where: { 
        projectId, 
        workspaceId, 
        deletedAt: { not: null } 
      },
      data: { deletedAt: null },
    });

    // 3. Log Audit Event (Passing 'tx' to stay in the transaction)
    await logAuditEvent({
      workspaceId,
      userId,
      action: "PROJECT_RESTORED",
      metadata: { 
        projectId,
        name: project.name,
        field: "deletedAt",
        newValue: "null" 
      },
    }, tx);

    return restored;
  });
},

};
