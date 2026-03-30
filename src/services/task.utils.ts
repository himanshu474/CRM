import { TaskStatus } from "@prisma/client";

export const autoUnblockTasks = async (tx: any, taskId: string) => {
  // Find all tasks that were blocked by the just-completed task
  const successors = await tx.taskDependency.findMany({
    where: { predecessorId: taskId },
  });

  for (const dep of successors) {
    // Count how many of this successor's predecessors are still not COMPLETED
    // Note: TaskDependency has no deletedAt — dependencies are hard-deleted (onDelete: Cascade)
    const unfinishedBlockers = await tx.taskDependency.count({
      where: {
        successorId: dep.successorId,
        predecessor: {
          status: { not: TaskStatus.COMPLETED },
          // deletedAt: null  — removed: field doesn't exist on TaskDependency
        },
      },
    });

    if (unfinishedBlockers === 0) {
      await tx.task.update({
        where: { id: dep.successorId },
        data:  { status: TaskStatus.TODO },  //  enum instead of raw string
      });
    }
  }
};