import prisma from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";

export const DealService = {
  async create(workspaceId: string, userId: string, data: any) {
    return prisma.deal.create({
      data: { ...data, workspaceId, ownerId: userId },
    });
  },

  async getAll(workspaceId: string, query: any) {
    return prisma.deal.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        // Only filter by status if it's provided in the query
        ...(query.status && { status: query.status }),
      },
      include: {
        contact: { select: { id: true, name: true, email: true } },
        company: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async update(dealId: string, workspaceId: string, data: any) {
    const deal = await prisma.deal.findFirst({
      where: { id: dealId, workspaceId, deletedAt: null },
    });
    if (!deal) throw new AppError("Deal not found", 404);

    return prisma.deal.update({ where: { id: dealId }, data });
  },

  async delete(dealId: string, workspaceId: string) {
    const deal = await prisma.deal.findFirst({
      where: { id: dealId, workspaceId, deletedAt: null },
    });
    if (!deal) throw new AppError("Deal not found", 404);

    return prisma.deal.update({
      where: { id: dealId },
      data: { deletedAt: new Date() },
    });
  },
};
