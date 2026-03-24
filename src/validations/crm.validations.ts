import { z } from "zod";
import { cuidSchema, nameSchema, paginationSchema } from "./common.validations.js";
import { LeadStatusEnum } from "../constants/enums.js";

// ================= COMPANY =================

export const createCompanySchema = z.object({
  params: z.object({
    workspaceId: cuidSchema("Workspace ID"),
  }),
  body: z.object({
    name: nameSchema(2, 100),
    website: z.string().url().optional(),
    industry: z.string().max(100).optional(),
  }).strict(),
});

export const updateCompanySchema = z.object({
  params: z.object({
    workspaceId: cuidSchema("Workspace ID"),
    companyId: cuidSchema("Company ID"),
  }),
  body: z.object({
    name: nameSchema(2, 100).optional(),
    website: z.string().url().optional(),
    industry: z.string().max(100).optional(),
  }).strict(),
});

// ================= CONTACT =================

export const createContactSchema = z.object({
  params: z.object({
    workspaceId: cuidSchema("Workspace ID"),
  }),
  body: z.object({
    name: nameSchema(2, 100),
    email: z.string().email().optional(),
    phone: z.string().max(20).optional(),
    companyId: z.string().cuid().optional(),
  }).strict(),
});

export const updateContactSchema = z.object({
  params: z.object({
    workspaceId: cuidSchema("Workspace ID"),
    contactId: cuidSchema("Contact ID"),
  }),
  body: z.object({
    name: nameSchema(2, 100).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(20).optional(),
    companyId: z.string().cuid().optional().nullable(),
  }).strict(),
});

// ================= DEAL =================

export const createDealSchema = z.object({
  params: z.object({
    workspaceId: cuidSchema("Workspace ID"),
  }),
  body: z.object({
    title: z.string().min(2).max(200),
    value: z.number().optional(),
    status: z.nativeEnum(LeadStatusEnum).optional(),
    companyId: z.string().cuid().optional(),
    contactId: z.string().cuid().optional(),
  }).strict(),
});

export const updateDealSchema = z.object({
  params: z.object({
    workspaceId: cuidSchema("Workspace ID"),
    dealId: cuidSchema("Deal ID"),
  }),
  body: z.object({
    title: z.string().min(2).max(200).optional(),
    value: z.number().optional(),
    status: z.nativeEnum(LeadStatusEnum).optional(),
    companyId: z.string().cuid().optional().nullable(),
    contactId: z.string().cuid().optional().nullable(),
  }).strict(),
});

export const getDealsQuerySchema = z.object({
  query: paginationSchema.extend({
    status: z.nativeEnum(LeadStatusEnum).optional(),
    search: z.string().optional(),
  }),
});