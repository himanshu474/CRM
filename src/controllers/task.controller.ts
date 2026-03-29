import { Response } from "express";
import { asyncHandler } from "../utils/common/asyncHandler.js";
import { TaskService } from "../services/task.service.js";
import { Req } from "../types/express.js";
import { AppError } from "../utils/AppError.js";
import { TaskStatus } from "@prisma/client";

/**
 * 🛡️ Permission Helper
 * Ensures only users with the correct workspace role can proceed.
 */
const validateAccess = (req: Req) => {
  if (!req.membership || !["ADMIN", "MEMBER"].includes(req.membership.role)) {
    throw new AppError("Insufficient permissions to perform this action", 403);
  }
};

// ================= 1. CREATE TASK =================
export const createTask = asyncHandler(async (req: Req, res: Response) => {
  validateAccess(req);

  const data = await TaskService.create(
    req.user!.id,
    req.params.workspaceId,
    req.params.projectId,
    req.body
  );

  res.status(201).json({ success: true, message: "Task created successfully", data });
});

// ================= 2. GET PROJECT TASKS =================
export const getTasksByProject = asyncHandler(async (req: Req, res: Response) => {
  validateAccess(req);

  const result = await TaskService.getByProject(
    req.params.workspaceId,
    req.params.projectId,
    req.query // page, limit, status, priority, search
  );

  res.status(200).json({ success: true, ...result });
});

// ================= 3. GET SINGLE TASK =================
export const getSingleTask = asyncHandler(async (req: Req, res: Response) => {
  validateAccess(req);

  const data = await TaskService.getOne(
    req.params.taskId,
    req.params.workspaceId
  );

  res.status(200).json({ success: true, data });
});

// ================= 4. UPDATE TASK DETAILS =================
export const updateTask = asyncHandler(async (req: Req, res: Response) => {
  validateAccess(req);

  const data = await TaskService.update(
    req.params.taskId,
    req.params.workspaceId,
    req.user!.id,
    req.body
  );

  res.status(200).json({ success: true, message: "Task updated", data });
});

// ================= 5. CHANGE STATUS =================
export const changeTaskStatus = asyncHandler(async (req: Req, res: Response) => {
  validateAccess(req);

  const data = await TaskService.changeStatus(
    req.params.taskId,
    req.params.workspaceId,
    req.user!.id,
    req.body.status as TaskStatus
  );

  res.status(200).json({ success: true, message: `Status updated to ${req.body.status}`, data });
});

// ================= 6. ASSIGN TASK =================
export const assignTask = asyncHandler(async (req: Req, res: Response) => {
  validateAccess(req);

  const data = await TaskService.assign(
    req.params.taskId,
    req.params.workspaceId,
    req.user!.id,
    req.body.assigneeId
  );

  res.status(200).json({ success: true, message: "Assignee updated successfully", data });
});

// ================= 7. GET MY TASKS =================
export const getMyTasks = asyncHandler(async (req: Req, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  const result = await TaskService.getMyTasks(
    req.user!.id,
    req.params.workspaceId, // Optional workspace filter
    req.query.status as TaskStatus,
    page,
    limit
  );

  res.status(200).json({ success: true, ...result });
});

// ================= 8. DELETE TASK (SOFT) =================
export const deleteTask = asyncHandler(async (req: Req, res: Response) => {
  validateAccess(req);

  await TaskService.delete(
    req.params.taskId,
    req.params.workspaceId,
    req.user!.id
  );

  res.status(200).json({ success: true, message: "Task moved to trash" });
});
