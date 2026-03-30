import prisma from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { WorkspaceRole } from "@prisma/client";
import { logAuditEvent } from "../utils/security/audit.utils.js";
import { NotificationService } from "./notification.service.js";

export const WorkspaceService = {
  /**
   * Create Workspace
   * Uses a transaction to ensure User is linked and Admin member is created.
   */
  async create(userId: string, name: string) {
    return await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name,
          ownerId: userId,
          members: {
            create: {
              userId,
              role: WorkspaceRole.ADMIN,
            },
          },
        },
      });

      await logAuditEvent({
        workspaceId: workspace.id,
        userId,
        action: "WORKSPACE_CREATED",
      }, tx); // Pass transaction client to audit logger if supported

      return workspace;
    });
  },

  async getMyWorkspaces(userId: string) {
    return prisma.workspace.findMany({
      where: {
        deletedAt: null,
        members: { some: { userId } },
      },
      orderBy: { createdAt: "desc" },
      select: { 
        id: true, 
        name: true, 
        createdAt: true,
        _count: { select: { members: true, projects: true } } 
      },
    });
  },

  /**
   * ✉️ Invite Member
   * Added: Real-time notification for the invited user.
   */
  async inviteMember(workspaceId: string, userId: string, targetEmail: string, role: WorkspaceRole) {
    // 1. Find user by email (production apps usually invite via email, not ID)
    const targetUser = await prisma.user.findUnique({ where: { email: targetEmail } });
    if (!targetUser) throw new AppError("User not found with this email", 404);

    // 2. Check if already a member (including soft-deleted memberships)
    const exists = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUser.id } },
    });

    if (exists) throw new AppError("User is already a member of this workspace", 409);

    const member = await prisma.workspaceMember.create({
      data: { workspaceId, userId: targetUser.id, role },
    });

    // 3. Notify the target user
    await NotificationService.notify(targetUser.id, {
      workspaceId,
      type: "WORKSPACE_INVITE",
      message: `You have been invited to join a workspace.`,
      metadata: { workspaceId }
    });

    await logAuditEvent({
      workspaceId,
      userId,
      action: "MEMBER_INVITED",
      metadata: { targetUserId: targetUser.id },
    });

    return member;
  },

  /**
   * 🗑️ Delete Workspace (Soft Delete)
   * Only the OWNER should be able to delete the entire workspace.
   */
  async delete(workspaceId: string, userId: string) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true }
    });

    if (!workspace) throw new AppError("Workspace not found", 404);
    if (workspace.ownerId !== userId) throw new AppError("Only the owner can delete the workspace", 403);

    const now = new Date();

    return await prisma.$transaction([
      prisma.workspace.update({
        where: { id: workspaceId },
        data: { deletedAt: now },
      }),
      // Cascade soft-delete to children
      prisma.project.updateMany({
        where: { workspaceId, deletedAt: null },
        data: { deletedAt: now },
      }),
      prisma.task.updateMany({
        where: { workspaceId, deletedAt: null },
        data: { deletedAt: now },
      }),
      prisma.activityLog.create({
        data: {
          workspaceId,
          userId,
          action: "WORKSPACE_DELETED",
        },
      }),
    ]);
  },

  /**
   * ♻️ Restore Workspace
   * Restores the workspace and its immediate children.
   */
  async restore(workspaceId: string, userId: string) {
    // Only owner check (same as delete)
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true }
    });
    if (workspace?.ownerId !== userId) throw new AppError("Unauthorized", 403);

    return await prisma.$transaction([
      prisma.workspace.update({
        where: { id: workspaceId },
        data: { deletedAt: null },
      }),
      prisma.project.updateMany({
        where: { workspaceId, deletedAt: { not: null } },
        data: { deletedAt: null },
      }),
      prisma.task.updateMany({
        where: { workspaceId, deletedAt: { not: null } },
        data: { deletedAt: null },
      }),
      prisma.activityLog.create({
        data: {
          workspaceId,
          userId,
          action: "WORKSPACE_RESTORED",
        },
      }),
    ]);
  },
};
