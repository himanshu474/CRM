import { Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  addDependencyService,
  removeDependencyService,
  getDependenciesService,
} from "../services/dependency.service.js";
import { Req } from "../types/express.js";

export const addDependency = asyncHandler(
  async (req: Req, res: Response) => {
    const { workspaceId, taskId, dependsOnTaskId } = req.params;

    await addDependencyService(
      workspaceId!,
      taskId!,
      dependsOnTaskId!,
      req.user!.id
    );

    res.status(201).json({
      success: true,
      message: "Dependency added",
    });
  }
);

export const removeDependency = asyncHandler(
  async (req: Req, res: Response) => {
    const { workspaceId, taskId, dependsOnTaskId } = req.params;

    await removeDependencyService(
      workspaceId!,
      taskId!,
      dependsOnTaskId!,
      req.user!.id
    );

    res.json({
      success: true,
      message: "Dependency removed",
    });
  }
);

export const getDependencies = asyncHandler(
  async (req: Req, res: Response) => {
    const { taskId } = req.params;

    const data = await getDependenciesService(taskId!);

    res.json({
      success: true,
      data,
    });
  }
);