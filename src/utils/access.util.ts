import prisma from "../config/prisma.js";
import { AppError } from "./AppError.js";

// CORE ACCESS ENGINE: Single Database Hit
// Verifies Project/Workspace existence AND User Membership simultaneously.

export const getResourceAccess = async (userId: string, workspaceId?: string, projectId?: string) => {
    // If only WorkspaceId is provided
    if (workspaceId && !projectId) {
        const membership = await prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId } },
            include: { workspace: true }
        });

        if (!membership || membership.workspace.deletedAt) {
            throw new AppError("Workspace not found or access denied", 404);
        }
        return { membership, workspace: membership.workspace };
    }

    // If ProjectId is provided (Checks Workspace Access automatically)
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

        if (!project) throw new AppError("Project not found or access denied", 404);

        return { 
            project, 
            workspace: project.workspace, 
            membership: project.workspace.members[0] 
        };
    }

    throw new AppError("Resource identifier required", 400);
};


 // Role Enforcement (Admin Only)
 
export const requireAdmin = (role: string) => {
    if (role !== "ADMIN") throw new AppError("Forbidden: Admin access required", 403);
};
