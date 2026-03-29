import prisma from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { hasCycle } from "../utils/dependency.util.js";
import { logAuditEvent } from "../utils/security/audit.utils.js";

/**
 * Add Task Dependency
 * Logic: Checks for self-dependency, existence, duplicates, and circular references.
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

  // Verify both tasks exist and aren't deleted
  const [task, dependsOnTask] = await Promise.all([
    prisma.task.findFirst({ where: { id: taskId, workspaceId, deletedAt: null } }),
    prisma.task.findFirst({ where: { id: dependsOnTaskId, workspaceId, deletedAt: null } }),
  ]);

  if (!task || !dependsOnTask) throw new AppError("Task not found", 404);

  return prisma.$transaction(async (tx) => {
    // 2. Duplicate Check
    const existing = await tx.taskDependency.findUnique({
      where: {
        predecessorId_successorId: {
          predecessorId: dependsOnTaskId,
          successorId: taskId,
        },
      },
    });
    if (existing) throw new AppError("Dependency already exists", 400);

    // 3. Circular Reference Check (Pass tx for consistency)
    const cycle = await hasCycle(dependsOnTaskId, taskId, tx);
    if (cycle) throw new AppError("Circular dependency detected", 400);

    // 4. Create Link
    await tx.taskDependency.create({
      data: { predecessorId: dependsOnTaskId, successorId: taskId },
    });

    // 5. Audit Log
    await logAuditEvent({
      workspaceId,
      userId,
      taskId,
      action: "DEPENDENCY_ADDED",
      metadata: { dependsOnTaskId, predecessorTitle: dependsOnTask.title },
    }, tx);
  });
};

/**
 *Remove Task Dependency
 */
export const removeDependencyService = async (
  workspaceId: string,
  taskId: string,
  dependsOnTaskId: string,
  userId: string
) => {
  return prisma.$transaction(async (tx) => {
    await tx.taskDependency.delete({
      where: {
        predecessorId_successorId: {
          predecessorId: dependsOnTaskId,
          successorId: taskId,
        },
      },
    }).catch(() => { throw new AppError("Dependency link not found", 404); });

    await logAuditEvent({
      workspaceId,
      userId,
      taskId,
      action: "DEPENDENCY_REMOVED",
      metadata: { dependsOnTaskId },
    }, tx);
  });
};

/**
 * Get Task Dependencies
 * Logic: Returns lists of blockers (predecessors) and blocked tasks (successors).
 */
export const getDependenciesService = async (taskId: string) => {
  // 1. Verify task exists and isn't deleted
  const task = await prisma.task.findUnique({
    where: { id: taskId, deletedAt: null }
  });

  if (!task) throw new AppError("Task not found", 404);

  // 2. Fetch predecessors and successors in parallel
  const [predecessors, successors] = await Promise.all([
    prisma.taskDependency.findMany({
      where: { successorId: taskId },
      include: { 
        predecessor: { 
          select: { id: true, title: true, status: true, priority: true } 
        } 
      },
    }),
    prisma.taskDependency.findMany({
      where: { predecessorId: taskId },
      include: { 
        successor: { 
          select: { id: true, title: true, status: true, priority: true } 
        } 
      },
    }),
  ]);

  // 3. Logic: Is the current task blocked?
  const isBlocked = predecessors.some((p) => p.predecessor.status !== "COMPLETED");

  return {
    blockingMe: predecessors.map((p) => p.predecessor), // Tasks I am waiting for
    waitingOnMe: successors.map((s) => s.successor),   // Tasks waiting for me
    isBlocked,
  };
};

/**
 * Get Critical Path
 * Logic: Finds the longest chain of dependencies in the system.
 */
export const getCriticalPath = async (workspaceId: string) => {
  const deps = await prisma.taskDependency.findMany({
    where: { predecessor: { workspaceId, deletedAt: null } }
  });

  const graph = new Map<string, string[]>();
  deps.forEach((d) => {
    const list = graph.get(d.predecessorId) || [];
    list.push(d.successorId);
    graph.set(d.predecessorId, list);
  });

  let longestPath: string[] = [];

  const memo = new Map<string, string[]>();

  const findLongest = (node: string): string[] => {
    if (memo.has(node)) return memo.get(node)!;
    
    let subLongest: string[] = [];
    const neighbors = graph.get(node) || [];
    
    for (const neighbor of neighbors) {
      const path = findLongest(neighbor);
      if (path.length > subLongest.length) {
        subLongest = path;
      }
    }

    const result = [node, ...subLongest];
    memo.set(node, result);
    return result;
  };

  for (const nodeId of graph.keys()) {
    const currentPath = findLongest(nodeId);
    if (currentPath.length > longestPath.length) {
      longestPath = currentPath;
    }
  }

  return longestPath;
};
