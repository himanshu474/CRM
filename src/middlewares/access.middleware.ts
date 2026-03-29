import { asyncHandler } from "../utils/common/asyncHandler.js";
import { getResourceAccess } from "../utils/access.util.js";
import { AppError } from "../utils/AppError.js";
import { Req } from "../types/express.js";
import { ERROR_MESSAGES } from "../constants/errorMessages.js";

const normalize = (val?: string | string[]) =>
  Array.isArray(val) ? val[0] : val;

export const authorize = asyncHandler(async (req: Req, _res, next) => {
  // 1. Extract IDs from Params or Body
  const workspaceId = normalize(req.params.workspaceId || req.body.workspaceId);
  const projectId = normalize(req.params.projectId || req.body.projectId);
  const dealId = normalize(req.params.dealId || req.body.dealId); // CRM Link

  if (!workspaceId && !projectId && !dealId) {
    throw new AppError("Access context (Workspace, Project, or Deal ID) required", 400);
  }

  // 2. Fetch Access (Ismein Deal validation bhi add karenge)
  const access = await getResourceAccess(
    req.user!.id,
    workspaceId,
    projectId,
    dealId
  );

  // 3. Workspace Membership Check
  if (!access.membership) {
    throw new AppError(ERROR_MESSAGES.WORKSPACE.ACCESS_DENIED, 403);
  }

  // 4. Project Ownership Check
  if (projectId && access.project && workspaceId && access.project.workspaceId !== workspaceId) {
    throw new AppError(ERROR_MESSAGES.PROJECT.NOT_FOUND, 403);
  }

  // 5. Deal Ownership Check (CRM logic)
  if (dealId && access.deal && workspaceId && access.deal.workspaceId !== workspaceId) {
    throw new AppError(ERROR_MESSAGES.TASK.NOT_FOUND, 403); // Or Deal.NOT_FOUND
  }

  // 6. Attach to Request (Type-safe using our 'Req' type)
  req.membership = access.membership;
  if (access.project) req.project = access.project;
  if (access.deal) (req as any).deal = access.deal; // Add to req for CRM routes

  next();
});
