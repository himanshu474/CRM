import { Response } from "express";
import { asyncHandler } from "../utils/common/asyncHandler.js";
import { WorkspaceService } from "../services/workspace.service.js";
import { Req } from "../types/express.js";
import { WorkspaceRole } from "@prisma/client";
import { AppError } from "../utils/AppError.js";

export const WorkspaceController = {
  /**
   * 🏗️ Create Workspace
   */
  create: asyncHandler(async (req: Req, res: Response) => {
    const data = await WorkspaceService.create(req.user!.id, req.body.name);

    res.status(201).json({
      success: true,
      data,
    });
  }),

  /**
   * 📋 List My Workspaces
   */
  getMyWorkspaces: asyncHandler(async (req: Req, res: Response) => {
    const data = await WorkspaceService.getMyWorkspaces(req.user!.id);

    res.json({
      success: true,
      data,
    });
  }),

  /**
   * ✉️ Invite Member
   * Note: We use targetEmail as SaaS best practice for invitations
   */
  inviteMember: asyncHandler(async (req: Req, res: Response) => {
    // 🛡️ Guard: Only Admin can invite
    if (req.membership?.role !== WorkspaceRole.ADMIN) {
      throw new AppError("Forbidden: Admin access required to invite members", 403);
    }

    const data = await WorkspaceService.inviteMember(
      req.params.workspaceId!,
      req.user!.id,
      req.body.email, // Switched to email for production-readiness
      req.body.role || WorkspaceRole.MEMBER
    );

    res.status(201).json({
      success: true,
      message: "Member invited successfully",
      data,
    });
  }),

  /**
   * 🗑️ Soft Delete Workspace
   */
  delete: asyncHandler(async (req: Req, res: Response) => {
    // 🛡️ Guard: Only Admin/Owner can delete
    if (req.membership?.role !== WorkspaceRole.ADMIN) {
      throw new AppError("Forbidden: Admin access required", 403);
    }

    await WorkspaceService.delete(req.params.workspaceId!, req.user!.id);

    res.json({
      success: true,
      message: "Workspace and related data moved to trash",
    });
  }),

  /**
   * ♻️ Restore Workspace
   */
  restore: asyncHandler(async (req: Req, res: Response) => {
    if (req.membership?.role !== WorkspaceRole.ADMIN) {
      throw new AppError("Forbidden: Admin access required", 403);
    }

    await WorkspaceService.restore(req.params.workspaceId!, req.user!.id);

    res.json({
      success: true,
      message: "Workspace restored successfully",
    });
  }),
};
