import { Response } from "express";
import { asyncHandler } from "../utils/common/asyncHandler.js";
import { Req } from "../types/express.js";
import { AppError } from "../utils/AppError.js";
import {
  addDependencyService,
  removeDependencyService,
  getDependenciesService,
  getCriticalPath 
} from "../services/dependency.service.js";

/**
 *  Permission Helper
 */
const validateAccess = (req: Req) => {
  if (!req.membership || !["ADMIN", "MEMBER"].includes(req.membership.role)) {
    throw new AppError("Insufficient permissions to modify dependencies", 403);
  }
};

// ================= ADD DEPENDENCY =================
export const addDependency = asyncHandler(async (req: Req, res: Response) => {
  validateAccess(req); // Added missing permission check

  const { workspaceId, taskId, dependsOnTaskId } = req.params;

  await addDependencyService(
    workspaceId,
    taskId,
    dependsOnTaskId,
    req.user!.id
  );

  res.status(201).json({ success: true, message: "Dependency added" });
});

// ================= REMOVE DEPENDENCY =================
export const removeDependency = asyncHandler(async (req: Req, res: Response) => {
  validateAccess(req); // Added missing permission check

  const { workspaceId, taskId, dependsOnTaskId } = req.params;

  await removeDependencyService(
    workspaceId,
    taskId,
    dependsOnTaskId,
    req.user!.id
  );

  res.json({ success: true, message: "Dependency removed" });
});

// ================= GET TASK DEPENDENCIES =================

export const getDependencies = asyncHandler(async (req: Req, res: Response) => {
  const { taskId } = req.params; // TypeScript knows this is a string

  const data = await getDependenciesService(taskId);

  res.status(200).json({
    success: true,
    data,
  });
});


// ================= GET CRITICAL PATH =================
/**
 * New Controller: Fetches the longest chain of tasks
 * Typically used on a Project Dashboard.
 */
export const getProjectCriticalPath = asyncHandler(async (req: Req, res: Response) => {
  const { workspaceId } = req.params;
  
  const path = await getCriticalPath(workspaceId);

  res.json({
    success: true,
    data: path,
    message: "Longest dependency chain fetched"
  });
});
