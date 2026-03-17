import { Request, Response } from "express";
import prisma from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { Req } from "../types/express.js"; // Import your new 'Req'
import { WorkspaceRole } from "@prisma/client"; // Use Prisma Enums, not strings


 //Create Project
export const createProject = asyncHandler(async (req: Req, res: Response) => {
  const { name, description } = req.body;
    const { workspaceId } = req.params; 


  if (!req.membership||!["ADMIN", "MEMBER"].includes(req.membership.role)) {
    throw new AppError("Forbidden:Insufficient permissions", 403);
  }

  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, deletedAt: null },
  });

  if (!workspace) {
    throw new AppError("Workspace not found", 404);
  }

  const project = await prisma.project.create({
    data: {
      name,
      description: description ?? null,
      workspaceId,
      ownerId: req.user!.id,
    },
  });

  res.status(201).json({
    success: true,
    data: project,
  });
});


 //Get Workspace Projects
 
export const getWorkspaceProjects = asyncHandler(async (req: Req, res: Response) => {
  const { workspaceId } = req.params; 

  if (!req.membership) {
    throw new AppError("Access denied", 403);
  }

  const projects = await prisma.project.findMany({
    where: {
      workspaceId,
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
    },
  });

  res.json({
    success: true,
    count: projects.length,
    data: projects,
  });
});


 // Delete Project (Hardcore Soft Delete)
 
export const deleteProject = asyncHandler(async (req: Req, res: Response) => {
    const { projectId, workspaceId } = req.params; 

  if (!req.membership || req.membership.role !== WorkspaceRole.ADMIN) {
    throw new AppError("Admin required", 403);
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId,workspaceId, deletedAt: null },
  });

  if (!project) {
    throw new AppError("Project not found", 404);
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.project.update({
      where: { id: projectId},
      data: { deletedAt: now },
    }),
    prisma.task.updateMany({
      where: { projectId, workspaceId, deletedAt: null },
      data: { deletedAt: now },
    }),
      prisma.activityLog.create({
        data: { workspaceId, action: "DELETE_PROJECT", newValue: project.name, userId: req.user!.id }
    })
  ]);

  res.json({
    success: true,
    message: "Project moved to trash",
  });
});


//update project

export const updateProject = asyncHandler(async (req: Req, res: Response) => {
    const { projectId, workspaceId } = req.params;

  const { name, description } = req.body;

  if (!req.membership || req.membership.role !== WorkspaceRole.ADMIN) {
    throw new AppError("Admin required", 403);
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId,workspaceId, deletedAt: null },
  });

  if (!project) {
    throw new AppError("Project not found", 404);
  }

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: {
      name:name??undefined,
      description :description??undefined,
    },
  });

  res.json({
    success: true,
    data: updated,
  });
});


//restore project

export const restoreProject = asyncHandler(async (req: Req, res: Response) => {
  const { projectId, workspaceId } = req.params;


  if (!req.membership || req.membership.role !== WorkspaceRole.ADMIN) {
    throw new AppError("Admin required", 403);
  }

  await prisma.$transaction([
    prisma.project.update({
      where: { id: projectId }
      ,
      data: { deletedAt: null },
      
    }),
    prisma.task.updateMany({
      where: { projectId,workspaceId ,
                //Sirf wahi tasks restore karo jo project ke saath delete huye the
                deletedAt: { not: null } 
      },
      data: { deletedAt: null },
    }),
    prisma.activityLog.create({
        data: { 
          workspaceId, 
          action: "RESTORE_PROJECT", 
          userId: req.user!.id,
          field: "deletedAt",
          newValue: "null"
        }
    })
  ]);

  res.json({
    success: true,
    message: "Project restored successfully",
  });
});