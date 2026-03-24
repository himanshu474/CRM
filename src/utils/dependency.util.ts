


/**
 * Detects if adding a dependency between two tasks would create a circular reference.
 * Uses Breadth-First Search (BFS) to traverse the task graph.
 * 
 * @param startId - The ID of the task that will be the PREDECESSOR (the "parent").
 * @param targetId - The ID of the task that will be the SUCCESSOR (the "child").
 * @param tx - Optional Prisma transaction client to ensure data consistency.
 */
import prisma from "../config/prisma.js";
import { Prisma } from "@prisma/client";

/**
 * Detect circular dependency using BFS
 */
export async function hasCycle(
  startId: string,
  targetId: string,
  tx: Prisma.TransactionClient = prisma
): Promise<boolean> {
  if (startId === targetId) return true;

  const visited = new Set<string>();
  let queue: string[] = [targetId];

  while (queue.length > 0) {
    const dependencies = await tx.taskDependency.findMany({
      where: {
        predecessorId: { in: queue },
      },
      select: {
        successorId: true,
      },
    });

    const nextQueue: string[] = [];

    for (const dep of dependencies) {
      if (dep.successorId === startId) {
        return true;
      }

      if (!visited.has(dep.successorId)) {
        visited.add(dep.successorId);
        nextQueue.push(dep.successorId);
      }
    }

    queue = nextQueue;
  }

  return false;
}
