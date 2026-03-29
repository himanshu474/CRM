import { Prisma } from "@prisma/client";
import prisma from "../../config/prisma.js";

export const logAuditEvent = async (
  data: {
    workspaceId?: string;
    userId: string;
    taskId?: string;
    dealId?: string;
    action: string;
    metadata?: Record<string, any>;
  },
  tx?: Prisma.TransactionClient
) => {
  const client = tx || prisma;

  await client.activityLog.create({
    data: {
      workspaceId: data.workspaceId || "",
      userId: data.userId,
      taskId: data.taskId ?? null,
      dealId: data.dealId ?? null, 
      action: data.action,
      metadata: data.metadata,
    },
  });
};
