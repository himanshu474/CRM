import prisma from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { hasCycle } from "../utils/dependency.util.js";
import { logAuditEvent } from "../utils/security/audit.utils.js";

/**
 * Add dependency
 */
export const addDependencyService = async (
  workspaceId: string,
  taskId: string,
  dependsOnTaskId: string,
  userId: string
) => {
  if (taskId === dependsOnTaskId) {
    throw new AppError("Task cannot depend on itself", 400);
  }

  const [task, dependsOnTask] = await Promise.all([
    prisma.task.findUnique({ where: { id: taskId, workspaceId } }),
    prisma.task.findUnique({ where: { id: dependsOnTaskId, workspaceId } }),
  ]);

  if (!task || !dependsOnTask) {
    throw new AppError("Task not found", 404);
  }

  const existing = await prisma.taskDependency.findUnique({
    where: {
      predecessorId_successorId: {
        predecessorId: dependsOnTaskId,
        successorId: taskId,
      },
    },
  });

  if (existing) throw new AppError("Dependency exists", 400);

  const cycle = await hasCycle(dependsOnTaskId, taskId);
  if (cycle) throw new AppError("Circular dependency", 400);

  await prisma.$transaction(async (tx) => {
    await tx.taskDependency.create({
      data: {
        predecessorId: dependsOnTaskId,
        successorId: taskId,
      },
    });

    await logAuditEvent(
      {
        workspaceId,
        userId,
        taskId,
        action: "DEPENDENCY_ADDED",
        metadata: { dependsOnTaskId },
      },
      tx
    );
  });
};

/**
 * Remove dependency
 */
export const removeDependencyService = async (
  workspaceId: string,
  taskId: string,
  dependsOnTaskId: string,
  userId: string
) => {
  await prisma.$transaction(async (tx) => {
    await tx.taskDependency.delete({
      where: {
        predecessorId_successorId: {
          predecessorId: dependsOnTaskId,
          successorId: taskId,
        },
      },
    });

    await logAuditEvent(
      {
        workspaceId,
        userId,
        taskId,
        action: "DEPENDENCY_REMOVED",
        metadata: { dependsOnTaskId },
      },
      tx
    );
  });
};

/**
 * Get dependencies
 */
export const getDependenciesService = async (taskId: string) => {
  const predecessors = await prisma.taskDependency.findMany({
    where: { successorId: taskId },
    include: { predecessor: true },
  });

  const successors = await prisma.taskDependency.findMany({
    where: { predecessorId: taskId },
    include: { successor: true },
  });

  const isBlocked = predecessors.some(
    (p) => p.predecessor.status !== "COMPLETED"
  );

  return {
    predecessors: predecessors.map((p) => p.predecessor),
    successors: successors.map((s) => s.successor),
    isBlocked,
  };
};


export const getCriticalPath = async () => {
  const deps = await prisma.taskDependency.findMany();

  const graph = new Map<string, string[]>();

  deps.forEach((d) => {
    if (!graph.has(d.predecessorId)) {
      graph.set(d.predecessorId, []);
    }
    graph.get(d.predecessorId)!.push(d.successorId);
  });

  let longest: string[] = [];

  const dfs = (node: string, path: string[]) => {
    path.push(node);

    if (!graph.has(node)) {
      if (path.length > longest.length) longest = [...path];
    } else {
      for (const next of graph.get(node)!) {
        dfs(next, [...path]);
      }
    }
  };

  for (const key of graph.keys()) {
    dfs(key, []);
  }

  return longest;
};