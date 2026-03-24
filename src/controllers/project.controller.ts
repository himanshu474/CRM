import { Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ProjectService } from "../services/project.service.js";
import { Req } from "../types/express.js";
import { WorkspaceRole } from "@prisma/client";
import { AppError } from "../utils/AppError.js";

 //Create Project
export const createProject = asyncHandler(async (req: Req, res: Response) => {
    const { workspaceId } = req.params; 


  if (!req.membership||!["ADMIN", "MEMBER"].includes(req.membership.role)) {
    throw new AppError("Forbidden:Insufficient permissions", 403);
  }

    const data = await ProjectService.create(workspaceId!, req.user!.id, req.body);

  res.status(201).json({
    success: true,
    data,
  });
});


 //Get Workspace Projects
 
export const getWorkspaceProjects = asyncHandler(async (req: Req, res: Response) => {
  const { workspaceId } = req.params; 

  if (!req.membership) {
    throw new AppError("Access denied", 403);
  }

   const data = await ProjectService.getAll(workspaceId!);

  res.json({
    success: true,
    count: data.length,
    data,
  });
});


 // Delete Project (Hardcore Soft Delete)
 
export const deleteProject = asyncHandler(async (req: Req, res: Response) => {
  const { projectId, workspaceId } = req.params;
  const userId = req.user!.id;

  // 1. Permission Guard (Controller's responsibility)
  if (!req.membership || req.membership.role !== WorkspaceRole.ADMIN) {
    throw new AppError("Forbidden: Admin privileges required to delete projects", 403);
  }

  // 2. Delegate Business Logic to Service
  // The service handles: finding the project, checking workspace ownership, 
  // the transaction for tasks, and creating the audit log.
  await ProjectService.delete(
    workspaceId!, 
    projectId!, 
    userId
  );

  // 3. Send final response
  res.json({
    success: true,
    message: "Project and associated tasks moved to trash successfully",
  });
});


//update project

export const updateProject = asyncHandler(async (req: Req, res: Response) => {
    const { projectId, workspaceId } = req.params;

  if (!req.membership || req.membership.role !== WorkspaceRole.ADMIN) {
    throw new AppError("Admin required", 403);
  }

  const updated = await ProjectService.update(workspaceId!, projectId!, req.body, req.user!.id);
  res.json({
    success: true,
    data: updated,
  });
});


//restore project

export const restoreProject = asyncHandler(async (req: Req, res: Response) => {
  const { workspaceId, projectId } = req.params;
  const userId = req.user!.id;

  // 1. Permission Guard: Only Admins can restore
  if (!req.membership || req.membership.role !== WorkspaceRole.ADMIN) {
    throw new AppError("Forbidden: Only workspace admins can restore projects", 403);
  }

  // 2. Delegate Business Logic to Service
  // The service handles: verification, project update, task bulk update, and audit log.
  const data = await ProjectService.restore(
    workspaceId!,
    projectId!,
    userId
  );

  // 3. Send Success Response
  res.json({
    success: true,
    message: "Project and associated tasks restored successfully",
    data, // Optional: returns the restored project object
  });
});