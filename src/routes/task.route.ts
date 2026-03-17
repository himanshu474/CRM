import { Router } from "express";
import {
  createTask,
  getTasksByProject,
  getSingleTask,
  updateTask,
  deleteTask,
  changeTaskStatus,
  assignTask,
  getMyTasks
} from "../controllers/task.controller.js";

import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/access.middleware.js";
import { validate } from "../middlewares/validate.js";

// Validations import
import { 
    assignTaskSchema, 
    myTasksQuerySchema,
    workspaceIdParamSchema,
    taskIdParamSchema // Dono workspaceId aur taskId handle karta hai
} from "../validations/auth.validations.js";


const router = Router();

// 1. GLOBAL: Me (Mounted under /api/workspaces/tasks/me)
router.get(
  "/tasks/me", 
  protect, // Token check only
  validate(myTasksQuerySchema), 
  getMyTasks
);

// All routes below require login
router.use(protect);

/**
 * 2. PROJECT-LEVEL TASKS
 * Full Path: POST /api/workspaces/:workspaceId/projects/:projectId/tasks
 */
router.post(
  "/:workspaceId/projects/:projectId/tasks",
  validate(workspaceIdParamSchema), 
  authorize,
  createTask
);

router.get(
  "/:workspaceId/projects/:projectId/tasks",
  validate(workspaceIdParamSchema),
  authorize,
  getTasksByProject
);

/**
 * 3. TASK-SPECIFIC OPERATIONS
 * Full Path: GET /api/workspaces/:workspaceId/tasks/:taskId
 */
router.get(
  "/:workspaceId/tasks/:taskId",
  validate(taskIdParamSchema),
  authorize,
  getSingleTask
);

router.patch(
  "/:workspaceId/tasks/:taskId",
  validate(taskIdParamSchema),
  authorize,
  updateTask
);

router.delete(
  "/:workspaceId/tasks/:taskId",
  validate(taskIdParamSchema),
  authorize,
  deleteTask
);

/**
 * 4. SPECIFIC ACTIONS (Status & Assignment)
 */
router.patch(
  "/:workspaceId/tasks/:taskId/status",
  validate(taskIdParamSchema),
  authorize,
  changeTaskStatus
);

router.patch(
  "/:workspaceId/tasks/:taskId/assign",
  validate(assignTaskSchema), 
  authorize,
  assignTask
);

export default router;

