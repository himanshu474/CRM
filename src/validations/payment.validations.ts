// src/validations/payment.validations.ts — NEW
import { z } from "zod";

export const createStripeIntentSchema = z.object({
  params: z.object({
    workspaceId: z.string().cuid("Invalid workspace ID"),
  }),
  body: z.object({
    amount:      z.number().positive("Amount must be greater than 0"),
    currency:    z.string().length(3, "Currency must be a 3-letter ISO code").default("USD"),
    dealId:      z.string().cuid("Invalid deal ID").optional(),
    description: z.string().max(500).optional(),
  }),
});

export const createRazorpayOrderSchema = z.object({
  params: z.object({
    workspaceId: z.string().cuid("Invalid workspace ID"),
  }),
  body: z.object({
    amount:   z.number().positive("Amount must be greater than 0"),
    currency: z.string().length(3, "Currency must be a 3-letter ISO code").default("INR"),
    dealId:   z.string().cuid("Invalid deal ID").optional(),
    receipt:  z.string().max(40).optional(),
    notes:    z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  }),
});

export const verifyRazorpaySchema = z.object({
  body: z.object({
    orderId:   z.string().min(1, "orderId is required"),
    paymentId: z.string().min(1, "paymentId is required"),
    signature: z.string().min(1, "signature is required"),
  }),
});