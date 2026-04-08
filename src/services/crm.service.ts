import { LeadStatus } from "@prisma/client";
import prisma from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { NotificationService } from "./notification.service.js";
import { logAuditEvent } from "../utils/security/audit.utils.js";
import { PaymentService }        from "./payment.service.js";
import { emailQueue }            from "../jobs/email.queue.js";
import { notificationQueue }     from "../jobs/notification.queue.js";


/**
 * CRMService: Manages Deals, Contacts, and Companies.
 * 
 * Key Logic:
 * 1. Soft Deletes: Data is never immediately destroyed; it's marked with 'deletedAt'.
 * 2. Audit Trails: Every write/update/delete triggers a log for security and history.
 * 3. Notifications: Business events (like winning a deal) trigger automated alerts.
 */
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

      // Explanation: Log the creation with the initial value for the sales pipeline history.
      await logAuditEvent({
        workspaceId,
        userId,
        action: "DEAL_CREATED",
        metadata: { dealId: deal.id, title: deal.title, value: deal.value },
      });

      return deal;
    });
  },

  async getDeals(workspaceId: string, query: { status?: LeadStatus; ownerId?: string }) {
    // Explanation: Only fetch records where deletedAt is null (Soft Delete filter).
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

    // Explanation: Log the update. Metadata tracks which keys were modified.
    await logAuditEvent({
      workspaceId,
      userId,
      action: "DEAL_UPDATED",
      metadata: { dealId, updates: Object.keys(data) },
    });

    // Explanation: Trigger a celebration/notification only if the status changed specifically to 'WON'.
    if (data.status === LeadStatus.WON && existing.status !== LeadStatus.WON) {
      await NotificationService.notifyDealWon(deal.ownerId, deal, workspaceId);
    }

    return deal;
  },

  // ================= CONTACTS =================

  async createContact(workspaceId: string, userId: string, data: any) {
    const contact = await prisma.contact.create({
      data: { ...data, workspaceId, ownerId: userId },
    });

    // Explanation: Audit log captures the new contact entry for the workspace history.
    await logAuditEvent({
      workspaceId,
      userId,
      action: "CONTACT_CREATED",
      metadata: { contactId: contact.id, name: contact.name },
    });

    return contact;
  },

  async getContacts(workspaceId: string) {
    return prisma.contact.findMany({
      where: { workspaceId, deletedAt: null },
      include: {
        company: { select: { id: true, name: true } },
        _count: { select: { deals: true } }, // Show how many deals this contact is part of.
      },
      orderBy: { name: "asc" },
    });
  },

  async updateContact(contactId: string, workspaceId: string, userId: string, data: any) {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, workspaceId, deletedAt: null },
    });
    if (!contact) throw new AppError("Contact not found", 404);

    const updated = await prisma.contact.update({
      where: { id: contactId },
      data,
    });

    // Explanation: Important to log updates to contact info (e.g., email or phone changes).
    await logAuditEvent({
      workspaceId,
      userId,
      action: "CONTACT_UPDATED",
      metadata: { contactId, modifiedFields: Object.keys(data) },
    });

    return updated;
  },

  // ================= COMPANIES =================

  async createCompany(workspaceId: string, userId: string, data: any) {
    const company = await prisma.company.create({
      data: { ...data, workspaceId, ownerId: userId },
    });

    await logAuditEvent({
      workspaceId,
      userId,
      action: "COMPANY_CREATED",
      metadata: { companyId: company.id, name: company.name },
    });

    return company;
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

  async updateCompany(companyId: string, workspaceId: string, userId: string, data: any) {
    const company = await prisma.company.findFirst({
      where: { id: companyId, workspaceId, deletedAt: null },
    });
    if (!company) throw new AppError("Company not found", 404);

    const updated = await prisma.company.update({
      where: { id: companyId },
      data,
    });

    await logAuditEvent({
      workspaceId,
      userId,
      action: "COMPANY_UPDATED",
      metadata: { companyId, modifiedFields: Object.keys(data) },
    });

    return updated;
  },

  // ================= SHARED UTILITIES =================

  /**
   * softDelete
   * Explanation: Instead of a hard 'DELETE', we set 'deletedAt'. 
   * This allows for 30-day recovery and keeps Audit Logs linked to the ID.
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

      // Explanation: This ensures there is a record of WHO deleted the data.
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
