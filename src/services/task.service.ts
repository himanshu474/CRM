import prisma from "../config/prisma.js";

export const autoUnblockTasks = async (taskId: string) => {
  const children = await prisma.taskDependency.findMany({
    where: { predecessorId: taskId },
  });

  for (const dep of children) {
    const blockers = await prisma.taskDependency.findMany({
      where: { successorId: dep.successorId },
      include: { predecessor: true },
    });

    const allDone = blockers.every(
      (b) => b.predecessor.status === "COMPLETED"
    );

    if (allDone) {
      await prisma.task.update({
        where: { id: dep.successorId },
        data: { status: "TODO" },
      });
    }
  }
};