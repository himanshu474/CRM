import prisma from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { hasCycle } from "../utils/dependency.util.js";
import { logAuditEvent } from "../utils/security/audit.utils.js";
import { TaskStatus } from "@prisma/client";

// ─────────────────────────────────────────────
// ADD DEPENDENCY
// ─────────────────────────────────────────────

export const addDependencyService = async (
  workspaceId: string,
  taskId: string,
  dependsOnTaskId: string,
  userId: string
) => {
  // ✅ Self-dependency check
  if (taskId === dependsOnTaskId) {
    throw new AppError("Task cannot depend on itself", 400);
  }

  // ✅ Verify both tasks exist in the same workspace and aren't deleted
  const [task, dependsOnTask] = await Promise.all([
    prisma.task.findFirst({ where: { id: taskId,         workspaceId, deletedAt: null } }),
    prisma.task.findFirst({ where: { id: dependsOnTaskId, workspaceId, deletedAt: null } }),
  ]);

  if (!task)         throw new AppError("Task not found", 404);
  if (!dependsOnTask) throw new AppError("Dependency target task not found", 404); // ✅ separate messages — easier to debug

  // ✅ Duplicate check BEFORE opening a transaction — no point taking a lock if it already exists
  const existing = await prisma.taskDependency.findUnique({
    where: {
      predecessorId_successorId: {
        predecessorId: dependsOnTaskId,
        successorId:   taskId,
      },
    },
  });
  if (existing) throw new AppError("Dependency already exists", 400);

  // ✅ Cycle check BEFORE the transaction for the same reason
  const cycle = await hasCycle(dependsOnTaskId, taskId, prisma);
  if (cycle) throw new AppError("Circular dependency detected", 400);

  // Both checks passed — now create atomically with the audit log
  return prisma.$transaction(async (tx) => {
    await tx.taskDependency.create({
      data: { predecessorId: dependsOnTaskId, successorId: taskId },
    });

    await logAuditEvent({
      workspaceId,
      userId,
      taskId,
      action: "DEPENDENCY_ADDED",
      metadata: {
        predecessorId:    dependsOnTaskId,
        predecessorTitle: dependsOnTask.title,
      },
    }, tx);
  });
};

// ─────────────────────────────────────────────
// REMOVE DEPENDENCY
// ─────────────────────────────────────────────

export const removeDependencyService = async (
  workspaceId: string,
  taskId: string,
  dependsOnTaskId: string,
  userId: string
) => {
  // ✅ Verify dependency exists BEFORE opening a transaction
  // Avoids holding a DB lock just to discover the row doesn't exist
  const dep = await prisma.taskDependency.findUnique({
    where: {
      predecessorId_successorId: {
        predecessorId: dependsOnTaskId,
        successorId:   taskId,
      },
    },
    include: {
      // ✅ Verify both tasks belong to this workspace — prevents cross-workspace removal
      successor:   { select: { workspaceId: true } },
      predecessor: { select: { workspaceId: true } },
    },
  });

  if (!dep) throw new AppError("Dependency link not found", 404);

  // ✅ Workspace ownership check — ensures the caller can't remove deps from other workspaces
  if (
    dep.successor.workspaceId   !== workspaceId ||
    dep.predecessor.workspaceId !== workspaceId
  ) {
    throw new AppError("Dependency does not belong to this workspace", 403);
  }

  return prisma.$transaction(async (tx) => {
    await tx.taskDependency.delete({
      where: {
        predecessorId_successorId: {
          predecessorId: dependsOnTaskId,
          successorId:   taskId,
        },
      },
    });

    await logAuditEvent({
      workspaceId,
      userId,
      taskId,
      action: "DEPENDENCY_REMOVED",
      metadata: { predecessorId: dependsOnTaskId },
    }, tx);
  });
};

// ─────────────────────────────────────────────
// GET DEPENDENCIES
// ─────────────────────────────────────────────

export const getDependenciesService = async (
  taskId: string,
  workspaceId: string  // ✅ added — task lookup should be scoped to workspace
) => {
  const task = await prisma.task.findFirst({
    where: { id: taskId, workspaceId, deletedAt: null }, // ✅ findFirst with workspaceId scope
  });

  if (!task) throw new AppError("Task not found", 404);

  const [predecessors, successors] = await Promise.all([
    prisma.taskDependency.findMany({
      where:   { successorId: taskId },
      include: {
        predecessor: {
          select: { id: true, title: true, status: true, priority: true },
        },
      },
    }),
    prisma.taskDependency.findMany({
      where:   { predecessorId: taskId },
      include: {
        successor: {
          select: { id: true, title: true, status: true, priority: true },
        },
      },
    }),
  ]);

  // ✅ Use TaskStatus enum instead of raw string "COMPLETED"
  const isBlocked = predecessors.some(
    (p) => p.predecessor.status !== TaskStatus.COMPLETED
  );

  return {
    blockingMe:  predecessors.map((p) => p.predecessor), // tasks I am waiting for
    waitingOnMe: successors.map((s) => s.successor),     // tasks waiting for me
    isBlocked,
  };
};

// ─────────────────────────────────────────────
// GET CRITICAL PATH
// ─────────────────────────────────────────────

export const getCriticalPath = async (workspaceId: string) => {
  const deps = await prisma.taskDependency.findMany({
    where: {
      predecessor: { workspaceId, deletedAt: null },
      successor:   { deletedAt: null },  // ✅ also exclude soft-deleted successors
    },
    select: {
      predecessorId: true,
      successorId:   true,
    },
  });

  // ✅ Empty graph — return early, no work to do
  if (deps.length === 0) return [];

  // Build adjacency list
  const graph = new Map<string, string[]>();

  for (const d of deps) {
    if (!graph.has(d.predecessorId)) graph.set(d.predecessorId, []);
    graph.get(d.predecessorId)!.push(d.successorId);
  }

  // ✅ Collect all unique node IDs (not just predecessors — isolated successors need to be roots too)
  const allNodes = new Set<string>();
  for (const d of deps) {
    allNodes.add(d.predecessorId);
    allNodes.add(d.successorId);
  }

  // ✅ Find nodes with no incoming edges (true starting points of the graph)
  const hasIncoming = new Set(deps.map((d) => d.successorId));
  const roots = [...allNodes].filter((n) => !hasIncoming.has(n));

  const memo = new Map<string, string[]>();

  const findLongest = (node: string): string[] => {
    if (memo.has(node)) return memo.get(node)!;

    const neighbors = graph.get(node) ?? [];
    let subLongest: string[] = [];

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

  let longestPath: string[] = [];

  // ✅ Only start DFS from true root nodes — not every node in the graph.
  // Starting from mid-graph nodes double-counts sub-paths and can return
  // a path that starts in the middle of the real critical chain.
  for (const root of roots) {
    const path = findLongest(root);
    if (path.length > longestPath.length) {
      longestPath = path;
    }
  }

  return longestPath;
};