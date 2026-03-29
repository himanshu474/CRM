import { Response } from "express";
import { asyncHandler } from "../utils/common/asyncHandler.js";
import { ActivityService } from "../services/activity.service.js";
import { Req } from "../types/express.js";
import { AppError } from "../utils/AppError.js";

// ================= GET TASK ACTIVITY LOGS =================
export const getTaskActivityLogs = asyncHandler(async (req: Req, res: Response) => {
  // 🛡️ Permission Check
  if (!req.membership || !['ADMIN', 'MEMBER'].includes(req.membership.role)) {
    throw new AppError("Insufficient permissions", 403);
  }

  const result = await ActivityService.getTaskLogs(
    req.params.workspaceId,
    req.params.taskId,
    req.query
  );

  res.status(200).json({
    success: true,
    ...result,
  });
});

// ================= GET WORKSPACE ACTIVITY LOGS =================
export const getWorkspaceActivityLog = asyncHandler(async (req: Req, res: Response) => {
  // 🛡️ Admin Only Check
  if (req.membership?.role !== "ADMIN") {
    throw new AppError("Admin access required", 403);
  }

  const result = await ActivityService.getWorkspaceLogs(
    req.params.workspaceId,
    req.query
  );

  res.status(200).json({
    success: true,
    ...result,
  });
});
