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
  // Use the passed transaction client OR the global prisma instance
  const client = tx || prisma;

  try {
    return await client.activityLog.create({
      data: {
        // Ensure workspaceId is handled (your schema says it's required)
        workspaceId: data.workspaceId || "system", 
        userId: data.userId,
        taskId: data.taskId || null,
        dealId: data.dealId || null, 
        action: data.action,
        metadata: data.metadata || {},
      },
    });
  } catch (error) {
    // 🔥 Critical for transactions: If we are in a transaction, we MUST re-throw 
    // to ensure the parent operation (like Register/Delete) rolls back.
    if (tx) throw error;
    console.error(`[Audit Log Failed]: ${data.action}`, error);
  }
};
