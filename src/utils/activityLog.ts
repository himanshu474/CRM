import prisma from "../config/prisma.js";

interface LogData {
  workspaceId: string;
  userId: string;
  taskId?: string;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
}

export const createActivityLog = async (data: LogData) => {
  await prisma.activityLog.create({
    data: {
      workspaceId: data.workspaceId,
      userId: data.userId,
      taskId: data.taskId,
      action: data.action,
      field: data.field,
      oldValue: data.oldValue,
      newValue: data.newValue,
    },
  });
};