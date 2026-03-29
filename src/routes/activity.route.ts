import { Router } from "express";
import { 
    getTaskActivityLogs, 
    getWorkspaceActivityLog 
} from "../controllers/activity.controller.js";

// Middlewares
import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/access.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

// Validations
import { 
    getTaskActivityLogSchema, 
    getWorkspaceActivityLogSchema 
} from "../validations/activityLog.validations.js";

/**
 * mergeParams: true is essential if this is mounted under a parent 
 * workspace router to access :workspaceId.
 */
const router = Router({ mergeParams: true });

//All activity routes require a valid session
router.use(protect);

/**
 * TASK TIMELINE (History of a single task)
 * Access: ADMIN or MEMBER of the workspace.
 * URL: GET /api/workspaces/:workspaceId/tasks/:taskId/activities
 */
router.get(
  "/tasks/:taskId/activities",
  validate(getTaskActivityLogSchema),
  authorize, // Fetches req.membership and validates ownership
  getTaskActivityLogs
);

/**
 * WORKSPACE AUDIT LOG (Full activity feed)
 * Access: ADMIN ONLY (Enforced inside the controller).
 * URL: GET /api/workspaces/:workspaceId/activities
 */
router.get(
  "/activities",
  validate(getWorkspaceActivityLogSchema),
  authorize, // Fetches req.membership
  getWorkspaceActivityLog
);

export default router;
