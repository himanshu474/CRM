import { LeadStatus, PrismaClient } from "@prisma/client";
import prisma from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { NotificationService } from "./notification.service.js";
import { logAuditEvent } from "../utils/security/audit.utils.js";

export const CRMService = {
  // ================= DEALS =================

  async createDeal(workspaceId: string, userId: string, data: any) {
    return await prisma.$transaction(async (tx) => {
      const deal = await tx.deal.create({
        data: {
          ...data,
          workspaceId,
          ownerId: userId,
          value: data.value ? parseFloat(data.value) : null,
        },
      });

      await logAuditEvent({
        workspaceId,
        userId,
        action: "DEAL_CREATED",
        metadata: { dealId: deal.id, title: deal.title },
      });

      return deal;
    });
  },

  async getDeals(workspaceId: string, query: { status?: LeadStatus; ownerId?: string }) {
    return prisma.deal.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        ...(query.status && { status: query.status }),
        ...(query.ownerId && { ownerId: query.ownerId }),
      },
      include: {
        contact: { select: { id: true, name: true, email: true } },
        company: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  },

  async updateDeal(dealId: string, workspaceId: string, userId: string, data: any) {
    const existing = await prisma.deal.findFirst({
      where: { id: dealId, workspaceId, deletedAt: null },
    });

    if (!existing) throw new AppError("Deal not found", 404);

    const deal = await prisma.deal.update({
      where: { id: dealId },
      data: {
        ...data,
        value: data.value ? parseFloat(data.value) : undefined,
      },
    });

    // 🔥 Production Trigger: Notify owner if deal is marked as WON
    if (data.status === LeadStatus.WON && existing.status !== LeadStatus.WON) {
      await NotificationService.notifyDealWon(deal.ownerId, deal, workspaceId);
    }

    return deal;
  },

  // ================= CONTACTS =================

  async createContact(workspaceId: string, userId: string, data: any) {
    return prisma.contact.create({
      data: { ...data, workspaceId, ownerId: userId },
    });
  },

  async getContacts(workspaceId: string) {
    return prisma.contact.findMany({
      where: { workspaceId, deletedAt: null },
      include: {
        company: { select: { id: true, name: true } },
        _count: { select: { deals: true } },
      },
      orderBy: { name: "asc" },
    });
  },
   async updateContact(contactId: string, workspaceId: string, data: any) {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, workspaceId, deletedAt: null },
    });
    if (!contact) throw new AppError("Contact not found", 404);

    return prisma.contact.update({
      where: { id: contactId },
      data,
    });
  },

  // ================= COMPANIES =================

  async createCompany(workspaceId: string, userId: string, data: any) {
    return prisma.company.create({
      data: { ...data, workspaceId, ownerId: userId },
    });
  },

  async getCompanies(workspaceId: string) {
    return prisma.company.findMany({
      where: { workspaceId, deletedAt: null },
      include: {
        _count: { select: { contacts: true, deals: true } },
      },
      orderBy: { name: "asc" },
    });
  },

   async updateCompany(companyId: string, workspaceId: string, data: any) {
    const company = await prisma.company.findFirst({
      where: { id: companyId, workspaceId, deletedAt: null },
    });
    if (!company) throw new AppError("Company not found", 404);

    return prisma.company.update({
      where: { id: companyId },
      data,
    });
  },

  // ================= SHARED UTILITIES =================

  /**
   * 🔥 Generic Soft Delete for CRM entities
   * Validates existence and workspace alignment before deleting
   */
  async softDelete(
    model: "deal" | "contact" | "company",
    id: string,
    workspaceId: string,
    userId: string
  ) {
    const entity = await (prisma[model] as any).findFirst({
      where: { id, workspaceId, deletedAt: null },
    });

    if (!entity) throw new AppError(`${model} not found`, 404);

    return await prisma.$transaction(async (tx) => {
      const deleted = await (tx[model] as any).update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await logAuditEvent({
        workspaceId,
        userId,
        action: `${model.toUpperCase()}_DELETED`,
        metadata: { entityId: id },
      });

      return deleted;
    });
  },
};
