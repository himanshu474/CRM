import { Prisma } from "@prisma/client";
import prisma from "../../config/prisma.js";

export const logAuditEvent = async (
  data: {
    workspaceId: string; // Isse required rakhein taaki audit log adhura na rahe
    userId: string;
    taskId?: string;
    dealId?: string;
    action: string;
    metadata?: any; // Prisma Json type any ya object leta hai
  },
  tx?: Prisma.TransactionClient
) => {
  const client = tx || prisma;

  return await client.activityLog.create({
    data: {
      workspaceId: data.workspaceId,
      userId: data.userId,
      taskId: data.taskId || null, // undefined ki jagah null pass karein
      dealId: data.dealId || null, // undefined ki jagah null pass karein
      action: data.action,
      metadata: data.metadata || Prisma.JsonNull,
    },
  });
};
