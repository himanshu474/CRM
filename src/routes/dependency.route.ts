import { Router } from "express";
import * as DependencyController from "../controllers/dependency.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/access.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

import {
  addDependencySchema,
  removeDependencySchema,
  getDependencySchema,
  workspaceIdParamSchema,
} from "../validations/depenency.validations.js";

const router = Router({ mergeParams: true });

// All routes require Authentication and Workspace Context
router.use(protect, authorize);

/**
 * Workspace Insights
 * Path: GET /api/workspaces/:workspaceId/critical-path
 */
router.get(
  "/critical-path",
  validate(workspaceIdParamSchema),
  DependencyController.getProjectCriticalPath
);

/**
 * Task Dependencies
 * Path: /api/workspaces/:workspaceId/tasks/:taskId/dependencies
 */
router.route("/tasks/:taskId/dependencies")
  .get(validate(getDependencySchema), DependencyController.getDependencies);

/**
 * Specific Dependency Management
 * Path: /api/workspaces/:workspaceId/tasks/:taskId/dependencies/:dependsOnTaskId
 */
router.post(
  "/tasks/:taskId/dependencies/:dependsOnTaskId",
  validate(addDependencySchema),
  DependencyController.addDependency
);

router.delete(
  "/tasks/:taskId/dependencies/:dependsOnTaskId",
  validate(removeDependencySchema),
  DependencyController.removeDependency
);

export default router;
