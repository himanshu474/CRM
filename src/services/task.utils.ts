// task.utils.ts
export const autoUnblockTasks = async (tx: any, taskId: string) => {
  const successors = await tx.taskDependency.findMany({
    where: { predecessorId: taskId },
  });

  for (const dep of successors) {
    const unfinishedBlockers = await tx.taskDependency.count({
      where: {
        successorId: dep.successorId,
        predecessor: {
          status: { not: "COMPLETED" },
          deletedAt: null,
        },
      },
    });

    if (unfinishedBlockers === 0) {
      await tx.task.update({
        where: { id: dep.successorId },
        data: { status: "TODO" },
      });
    }
  }
};
