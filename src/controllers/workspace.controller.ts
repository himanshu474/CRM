import { Request, Response } from "express";
import prisma from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { WorkspaceRole } from "@prisma/client";
import { Req } from "../types/express.js"

export const createWorkspace = asyncHandler(async (req: Request, res: Response) => {
    const { name} = req.body;
    const userId = req.user!.id;

    const workspace = await prisma.workspace.create({
        data: {
            name,
            owner:
            {
                connect:
                    { id: userId }
            }, // Relation way
            members: {
                create: {
                    userId,
                    role: WorkspaceRole.ADMIN,
                    joinedAt: new Date(),
                }
            }
        }
    });

    res.status(201).json({ success: true, data: workspace });
});

export const getMyWorkspaces = asyncHandler(async (req: Request, res: Response) => {
    const workspaces = await prisma.workspace.findMany({
        where: {
            deletedAt: null,
            members: { some: { userId: req.user!.id } }
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, createdAt: true }
    });

    res.json({ success: true, count: workspaces.length, data: workspaces });
});


export const inviteMember = asyncHandler(async (req: Req, res: Response) => {
    const { userId, role } = req.body;
        const { workspaceId } = req.params; 

    
    
    if (!req.membership || req.membership.role !== WorkspaceRole.ADMIN) {
        throw new AppError("Forbidden: Only Admins can invite members", 403);
    }


    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("User not found in system", 404);

    const existing = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } }
    });

    if (existing) throw new AppError("User is already a member", 409);

    const newMember = await prisma.workspaceMember.create({
        data: { workspaceId, userId, role: role || WorkspaceRole.MEMBER },
    });

    res.status(201).json({ success: true, data: newMember });
});

export const deleteWorkspace = asyncHandler(async (req: Req, res: Response) => {
    const { workspaceId } = req.params; 
        const userId = req.user!.id;

    
    if (!req.membership) throw new AppError("Authorization context missing", 500);
    if (req.membership.role !== WorkspaceRole.ADMIN) throw new AppError("Admin required", 403);

    const now = new Date();
    await prisma.$transaction([
        // Prisma now receives a string, not an object
        prisma.workspace.update({ where: { id: workspaceId }, data: { deletedAt: now } }),
        prisma.project.updateMany({ where: { workspaceId, deletedAt: null }, data: { deletedAt: now } }),
        prisma.task.updateMany({ where: { workspaceId, deletedAt: null }, data: { deletedAt: now } }),
         prisma.activityLog.create({
            data: { workspaceId, action: "DELETE_WORKSPACE", userId }
        })
    ]);

    res.json({ success: true, message: "Workspace moved to trash" });
});

export const restoreWorkspace = asyncHandler(async (req: Req, res: Response) => {
    const { workspaceId } = req.params; 
    const userId=req.user!.id

    if (!req.membership) throw new AppError("Authorization context missing", 500);
    if (req.membership.role !== WorkspaceRole.ADMIN) throw new AppError("Admin required", 403);

    await prisma.$transaction([
        prisma.workspace.update({ where: { id: workspaceId }, data: { deletedAt: null } }),
         prisma.project.updateMany({ 
            where: { workspaceId, deletedAt: { not: null } }, 
            data: { deletedAt: null } 
        }),
        prisma.task.updateMany({ 
            where: { workspaceId, deletedAt: { not: null } }, 
            data: { deletedAt: null } 
        }),
        prisma.activityLog.create({
            data: { workspaceId, action: "RESTORE_WORKSPACE", userId }
        })
    ]);

    res.json({ success: true, message: "Workspace restored successfully" });
});



