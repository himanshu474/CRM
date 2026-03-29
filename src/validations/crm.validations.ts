// src/validations/crm.validations.ts

import { z } from "zod";
import {
  cuidSchema,
  optionalCuid,
  nameSchema,
  paginationSchema,
  searchSchema,
  phoneSchema
} from "./common.validations.js";
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


export const deleteCompanySchema = z.object({
  params: z.object({
    workspaceId: cuidSchema("Workspace ID"),
    companyId: cuidSchema("Company ID"),
  }),
});


export const restoreCompanySchema = z.object({
  params: z.object({
    workspaceId: cuidSchema("Workspace ID"),
  companyId: cuidSchema("Company ID"),
  }),
});

// ================= CONTACT =================

export const createContactSchema = z.object({
  params: z.object({
    workspaceId: cuidSchema("Workspace ID"),
  }),
  body: z.object({
    name: nameSchema(2, 100),
    email: z.string().email().optional(),
    phone: phoneSchema.optional(),
    companyId: optionalCuid("Company ID"),
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
    phone: phoneSchema.optional(),
    companyId: optionalCuid("Company ID"),
  }).strict(),
});



export const deleteContactSchema = z.object({
  params: z.object({
    workspaceId: cuidSchema("Workspace ID"),
    contactId: cuidSchema("Contact ID"),
  }),
});


export const restoreContactSchema = z.object({
  params: z.object({
    workspaceId: cuidSchema("Workspace ID"),
  contactId: cuidSchema("Contact ID"),
  }),
});


// ================= DEAL =================

export const createDealSchema = z.object({
  params: z.object({
    workspaceId: cuidSchema("Workspace ID"),
  }),
  body: z.object({
    title: z.string().min(2).max(200),
    value: z.number().min(0).optional(),
    status: z.nativeEnum(LeadStatusEnum).optional(),
    companyId: optionalCuid("Company ID"),
    contactId: optionalCuid("Contact ID"),
  }).strict(),
});

export const updateDealSchema = z.object({
  params: z.object({
    workspaceId: cuidSchema("Workspace ID"),
    dealId: cuidSchema("Deal ID"),
  }),
  body: z.object({
    title: z.string().min(2).max(200).optional(),
    value: z.number().min(0).optional(),
    status: z.nativeEnum(LeadStatusEnum).optional(),
    companyId: optionalCuid("Company ID"),
    contactId: optionalCuid("Contact ID"),
  }).strict(),
});

export const getDealsQuerySchema = z.object({
  query: paginationSchema
    .merge(searchSchema)
    .extend({
      status: z.nativeEnum(LeadStatusEnum).optional(),
    }).strict(),
});

export const deleteDealSchema = z.object({
  params: z.object({
    workspaceId: cuidSchema("Workspace ID"),
    dealId:cuidSchema('Deal ID'),
  }),
});


export const restoreDealSchema = z.object({
  params: z.object({
    workspaceId: cuidSchema("Workspace ID"),
    dealId: cuidSchema("Deal ID"),
  }),
});