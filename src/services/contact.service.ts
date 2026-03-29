import prisma from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";

export const ContactService = {
  async create(workspaceId: string, userId: string, data: any) {
    return prisma.contact.create({
      data: { ...data, workspaceId, ownerId: userId },
    });
  },

  async getAll(workspaceId: string) {
    return prisma.contact.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  },

  async update(contactId: string, workspaceId: string, data: any) {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, workspaceId, deletedAt: null },
    });
    if (!contact) throw new AppError("Contact not found", 404);

    return prisma.contact.update({ where: { id: contactId }, data });
  },

  async delete(contactId: string, workspaceId: string) {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, workspaceId, deletedAt: null },
    });
    if (!contact) throw new AppError("Contact not found", 404);

    return prisma.contact.update({
      where: { id: contactId },
      data: { deletedAt: new Date() },
    });
  },
};
