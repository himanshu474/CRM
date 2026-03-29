import prisma from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";

export const CompanyService = {
  async create(workspaceId: string, userId: string, data: any) {
    return prisma.company.create({
      data: {
        ...data,
        workspaceId,
        ownerId: userId,
      },
    });
  },

   async getAll(workspaceId: string) {
    return prisma.company.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  },

  async update(companyId: string, workspaceId: string, data: any) {
    const company = await prisma.company.findFirst({
      where: { id: companyId, workspaceId, deletedAt: null },
    });

    if (!company) throw new AppError("Company not found", 404);

    return prisma.company.update({
      where: { id: companyId },
      data,
    });
  },

  async delete(companyId: string, workspaceId: string) {
    const company = await prisma.company.findFirst({
      where: { id: companyId, workspaceId,deletedAt:null},
    });

    if (!company) throw new AppError("Company not found", 404);

    return prisma.company.update({
      where: { id: companyId },
      data: { deletedAt: new Date() },
    });
  },
};