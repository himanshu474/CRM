import { Response } from "express";
import { asyncHandler } from "../utils/common/asyncHandler.js";
import { Req } from "../types/express.js";
import { AppError } from "../utils/AppError.js";
import {
  addDependencyService,
  removeDependencyService,
  getDependenciesService,
  getCriticalPath,
} from "../services/dependency.service.js";

// ─────────────────────────────────────────────
// Permission guard
// ─────────────────────────────────────────────

const assertRole = (req: Req, roles = ["ADMIN", "MEMBER"]) => {
  if (!req.membership || !roles.includes(req.membership.role)) {
    throw new AppError("Insufficient permissions", 403);
  }
};

// ─────────────────────────────────────────────
// ADD DEPENDENCY
// ─────────────────────────────────────────────

export const addDependency = asyncHandler(async (req: Req, res: Response) => {
  assertRole(req);

  const { workspaceId, taskId, dependsOnTaskId } = req.params;

  await addDependencyService(workspaceId, taskId, dependsOnTaskId, req.user!.id);

  res.status(201).json({ success: true, message: "Dependency added" });
});

// ─────────────────────────────────────────────
// REMOVE DEPENDENCY
// ─────────────────────────────────────────────

export const removeDependency = asyncHandler(async (req: Req, res: Response) => {
  assertRole(req);

  const { workspaceId, taskId, dependsOnTaskId } = req.params;

  await removeDependencyService(workspaceId, taskId, dependsOnTaskId, req.user!.id);

  res.status(200).json({ success: true, message: "Dependency removed" });
});

// ─────────────────────────────────────────────
// GET TASK DEPENDENCIES
// ─────────────────────────────────────────────

export const getDependencies = asyncHandler(async (req: Req, res: Response) => {
  assertRole(req); // ✅ was missing — any authenticated user could read any task's deps

  const { workspaceId, taskId } = req.params; // ✅ workspaceId was missing entirely

  const data = await getDependenciesService(taskId, workspaceId); // ✅ pass workspaceId

  res.status(200).json({ success: true, data });
});

// ─────────────────────────────────────────────
// GET CRITICAL PATH
// ─────────────────────────────────────────────

export const getProjectCriticalPath = asyncHandler(async (req: Req, res: Response) => {
  assertRole(req); // ✅ was missing — open to any authenticated user

  const { workspaceId } = req.params;

  const path = await getCriticalPath(workspaceId);

  res.status(200).json({
    success: true,
    data: { path, length: path.length }, // ✅ include length — useful for frontend without extra .length call
  });
});