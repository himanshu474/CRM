import { Response, NextFunction } from "express";
import { Req } from "../types/express.js";
import { AppError } from "../utils/AppError.js";
import { WorkspaceRole } from "@prisma/client";
import { ERROR_MESSAGES } from "../constants/errorMessages.js";

/**
 * 1. Admin Only Guard
 * Use: Delete Workspace, Invite Members, Change Workspace Settings
 */
export const requireAdmin = (req: Req, _res: Response, next: NextFunction) => {
  // Check if authorize middleware already attached membership
  if (!req.membership || req.membership.role !== WorkspaceRole.ADMIN) {
    throw new AppError(ERROR_MESSAGES.AUTH.INSUFFICIENT_PERMISSIONS, 403);
  }
  next();
};

/**
 * 2. Member Access Guard (Allows both ADMIN and MEMBER)
 * Use: Create Deals, View Contacts, Upload Attachments
 */
export const requireMember = (req: Req, _res: Response, next: NextFunction) => {
  // Membership exists check (ensure 'authorize' middleware was called first)
  if (!req.membership) {
    throw new AppError(ERROR_MESSAGES.WORKSPACE.ACCESS_DENIED, 403);
  }
  next();
};

/**
 * 3. Flexible Role Guard (Helper for custom roles)
 * Use: checkRole([WorkspaceRole.ADMIN])
 */
export const checkRole = (allowedRoles: WorkspaceRole[]) => {
  return (req: Req, _res: Response, next: NextFunction) => {
    if (!req.membership || !allowedRoles.includes(req.membership.role)) {
      throw new AppError(ERROR_MESSAGES.AUTH.INSUFFICIENT_PERMISSIONS, 403);
    }
    next();
  };
};
