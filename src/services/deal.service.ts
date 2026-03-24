import prisma from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";

export const DealService = {
  async create(workspaceId: string, userId: string, data: any) {
    return prisma.deal.create({
      data: {
        ...data,
        workspaceId,
        ownerId: userId,
      },
    });
  },

  async update(dealId: string, workspaceId: string, data: any) {
    const deal = await prisma.deal.findFirst({
      where: { id: dealId, workspaceId, deletedAt: null },
    });

    if (!deal) throw new AppError("Deal not found", 404);

    return prisma.deal.update({
      where: { id: dealId },
      data,
    });
  },

  async getAll(workspaceId: string, query: any) {
    return prisma.deal.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        status: query.status,
      },
      include: {
        contact: true,
        company: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },
};