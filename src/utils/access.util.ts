import prisma from "../config/prisma.js";
import { AppError } from "./AppError.js";
import { ERROR_MESSAGES } from "../constants/errorMessages.js";

/**
 * CORE ACCESS ENGINE: Single Database Hit
 * Sab resources (Workspace, Project, Deal) ko ek hi function se secure karega.
 */
export const getResourceAccess = async (
    userId: string, 
    workspaceId?: string, 
    projectId?: string,
    dealId?: string
) => {
    // 1. CASE: Just Workspace Access (e.g., viewing all contacts)
    if (workspaceId && !projectId && !dealId) {
        const membership = await prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId } },
            include: { workspace: true }
        });

        if (!membership || membership.workspace.deletedAt) {
            throw new AppError(ERROR_MESSAGES.WORKSPACE.ACCESS_DENIED, 403);
        }
        return { membership, workspace: membership.workspace };
    }

    // 2. CASE: Project Access (Checks Workspace automatically)
    if (projectId) {
        const project = await prisma.project.findFirst({
            where: { 
                id: projectId, 
                deletedAt: null,
                workspace: { deletedAt: null, members: { some: { userId } } } 
            },
            include: { 
                workspace: { 
                    include: { members: { where: { userId }, take: 1 } } 
                } 
            }
        });

        if (!project) throw new AppError(ERROR_MESSAGES.PROJECT.NOT_FOUND, 404);

        return { 
            project, 
            workspace: project.workspace, 
            membership: project.workspace.members[0] 
        };
    }

    // 3. CASE: Deal Access (CRM specific logic)
    if (dealId) {
        const deal = await prisma.deal.findFirst({
            where: {
                id: dealId,
                deletedAt: null,
                workspace: { deletedAt: null, members: { some: { userId } } }
            },
            include: {
                workspace: {
                    include: { members: { where: { userId }, take: 1 } }
                }
            }
        });

        if (!deal) throw new AppError(ERROR_MESSAGES.TASK.NOT_FOUND, 404); // Use Deal NOT_FOUND if added to constant

        return {
            deal,
            workspace: deal.workspace,
            membership: deal.workspace.members[0]
        };
    }

    throw new AppError(ERROR_MESSAGES.COMMON.BAD_REQUEST, 400);
};

/**
 * Role Enforcement Helper
 */
export const requireAdmin = (role: string) => {
  if (role !== "ADMIN") {
    throw new AppError(ERROR_MESSAGES.AUTH.INSUFFICIENT_PERMISSIONS, 403);
  }
};
