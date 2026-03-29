import { Router } from "express";
import * as TaskController from "../controllers/task.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/access.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

// Import Schemas
import { 
  createTaskSchema, 
  getTasksQuerySchema, 
  updateTaskSchema, 
  changeStatusSchema, 
  assignTaskSchema,
  taskIdParamSchema,
  myTasksQuerySchema 
} from "../validations/task.validations.js";

const router = Router({ mergeParams: true });

/**
 * GLOBAL USER ROUTE (Dashboard)
 * Purpose: Fetch all tasks assigned to 'me' across projects.
 * Logic: Only 'protect' is needed because we filter by req.user.id.
 */
router.get(
  "/tasks/me", 
  protect, 
  validate(myTasksQuerySchema), 
  TaskController.getMyTasks
);

/**
 *MIDDLEWARE LOCK
 * All routes below require:
 * 1. Valid JWT (protect)
 * 2. Membership in the workspace (authorize)
 */
router.use(protect, authorize);

/**
 *  PROJECT-LEVEL ROUTES
 * POST: Create a task inside a project.
 * GET: List all tasks in a project (with filters).
 */
router.route("/projects/:projectId/tasks")
  .post(validate(createTaskSchema), TaskController.createTask)
  .get(validate(getTasksQuerySchema), TaskController.getTasksByProject);

/**
 * INDIVIDUAL TASK OPERATIONS
 * GET: Detailed view (Successors, Attachments, etc.).
 * PATCH: Edit details (Title, Description).
 * DELETE: Soft delete (Move to Trash).
 */
router.route("/tasks/:taskId")
  .get(validate(taskIdParamSchema), TaskController.getSingleTask)
  .patch(validate(updateTaskSchema), TaskController.updateTask)
  .delete(validate(taskIdParamSchema), TaskController.deleteTask);

/**
 * QUICK ACTION ROUTES
 * status: For Kanban drag-and-drop (handles dependency checks).
 * assign: For changing task ownership.
 */
router.patch(
  "/tasks/:taskId/status", 
  validate(changeStatusSchema), 
  TaskController.changeTaskStatus
);

router.patch(
  "/tasks/:taskId/assign", 
  validate(assignTaskSchema), 
  TaskController.assignTask
);

export default router;
