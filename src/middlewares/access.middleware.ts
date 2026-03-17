import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getResourceAccess } from "../utils/access.util.js";
import { AppError } from "../utils/AppError.js";

export const authorize = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const workspaceId = req.params.workspaceId || req.body.workspaceId;
    const projectId = req.params.projectId || req.body.projectId;

    if (!workspaceId && !projectId) {
      throw new AppError(
        "Workspace ID or Project ID is required for authorization",
        400
      );
    }

    const access = await getResourceAccess(
      req.user!.id,
      workspaceId,
      projectId
    );

    if (!access.membership) {
      throw new AppError("Access denied", 403);
    }

    // Cross-tenant guard
    if (
      projectId &&
      workspaceId &&
      access.project &&
      access.project.workspaceId !== workspaceId
    ) {
      throw new AppError(
        "Project does not belong to the specified workspace",
        403
      );
    }

    req.membership = access.membership;
    if (access.project) req.project = access.project;

    next();
  }
);