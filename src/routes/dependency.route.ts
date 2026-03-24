import { Router } from "express";
import {
  addDependency,
  removeDependency,
  getDependencies,
} from "../controllers/dependency.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/access.middleware.js";
import { validate } from "../middlewares/validate.js";

import {
  addDependencySchema,
  removeDependencySchema,
  getDependencySchema,
} from "../validations/depenency.validations.js";

const router = Router({ mergeParams: true });

router.use(protect);
router.use(authorize);

// Add
router.post(
  "/:taskId/dependencies/:dependsOnTaskId",
  validate(addDependencySchema),
  addDependency
);

// Remove
router.delete(
  "/:taskId/dependencies/:dependsOnTaskId",
  validate(removeDependencySchema),
  removeDependency
);

// Get
router.get(
  "/:taskId/dependencies",
  validate(getDependencySchema),
  getDependencies
);

export default router;