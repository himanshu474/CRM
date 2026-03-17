import { Router } from "express";
import { 
    getTaskActivityLogs, 
    getWorkspaceActivityLog 
} from "../controllers/activity.controller.js";

// Middlewares
import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/access.middleware.js";
import { validate } from "../middlewares/validate.js";

// Validations
import { 
    getTaskActivityLogSchema, 
    getWorkspaceActivityLogSchema 
} from "../validations/auth.validations.js";

const router = Router();

// Sabhi activity routes ke liye login check
router.use(protect);

/**
 * 1. GET TASK SPECIFIC ACTIVITIES (TIMELINE)
 * URL: GET /api/workspaces/:workspaceId/tasks/:taskId/activities
 */
router.get(
  "/:workspaceId/tasks/:taskId/activities", // Removed redundant '/workspaces' and '/activity'
  validate(getTaskActivityLogSchema),
  authorize,
  getTaskActivityLogs
);

/**
 * 2. GET WORKSPACE ACTIVITY LOGS (AUDIT LOG)
 * URL: GET /api/workspaces/:workspaceId/activities
 */
router.get(
  "/:workspaceId/activities", // Simple & clean path
  validate(getWorkspaceActivityLogSchema),
  authorize,
  getWorkspaceActivityLog
);

export default router;

