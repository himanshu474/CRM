// src/services/payment.service.ts — NEW
import Stripe                              from "stripe";
import crypto                              from "crypto";
import { stripe, razorpay }               from "../config/payment.js";
import prisma                          from "../config/prisma.js";
import { AppError }                        from "../utils/AppError.js";
import { logAuditEvent }                   from "../utils/security/audit.utils.js";
import { NotificationService }             from "./notification.service.js";
import { PaymentProvider, PaymentStatus }  from "@prisma/client";
import type {
  CreateStripeIntentParams,
  CreateRazorpayOrderParams,
  VerifyRazorpaySignatureParams,
  StripePaymentIntentResult,
  RazorpayOrderResult,
} from "../types/payment.types.js";

export const PaymentService = {

  // ─── STRIPE ──────────────────────────────────

  async createStripePaymentIntent(
    params: CreateStripeIntentParams
  ): Promise<StripePaymentIntentResult> {
    const { workspaceId, dealId, amount, currency, description } = params;

    const intent = await stripe.paymentIntents.create({
      amount,
      currency:    currency.toLowerCase(),
      description,
      metadata: {
        workspaceId,
        dealId: dealId ?? "",
      },
    });

    const payment = await prisma.payment.create({
      data: {
        workspaceId,
        dealId:            dealId ?? null,
        amount:            amount / 100,
        currency:          currency.toUpperCase(),
        status:            PaymentStatus.PENDING,
        provider:          PaymentProvider.STRIPE,
        providerPaymentId: intent.id,
        notes:             description,
      },
    });

    return {
      clientSecret: intent.client_secret!,
      paymentId:    payment.id,
    };
  },

  async handleStripeWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new AppError("Stripe webhook secret is not configured.", 500);
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      throw new AppError("Invalid Stripe webhook signature.", 400);
    }

    switch (event.type) {
      case "payment_intent.succeeded": {
        const intent  = event.data.object as Stripe.PaymentIntent;
        const payment = await prisma.payment.findFirst({
          where: { providerPaymentId: intent.id },
        });

        if (!payment) break;

        await prisma.payment.update({
          where: { id: payment.id },
          data:  { status: PaymentStatus.COMPLETED },
        });

        await logAuditEvent({
          workspaceId: payment.workspaceId,
          userId:      "system",
          dealId:      payment.dealId ?? undefined,
          action:      "PAYMENT_COMPLETED",
          metadata:    { provider: "STRIPE", amount: Number(payment.amount), currency: payment.currency },
        });

        if (payment.dealId) {
          const deal = await prisma.deal.findUnique({
            where:  { id: payment.dealId },
            select: { ownerId: true, title: true },
          });
          if (deal) {
            await NotificationService.notify(deal.ownerId, {
              workspaceId: payment.workspaceId,
              type:        "PAYMENT_COMPLETED",
              message:     `Payment received for deal: ${deal.title}`,
              metadata:    { paymentId: payment.id, amount: Number(payment.amount) },
            });
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        await prisma.payment.updateMany({
          where: { providerPaymentId: intent.id },
          data:  { status: PaymentStatus.FAILED },
        });
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        if (charge.payment_intent) {
          await prisma.payment.updateMany({
            where: { providerPaymentId: charge.payment_intent as string },
            data:  { status: PaymentStatus.REFUNDED },
          });
        }
        break;
      }

      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }
  },

  // ─── RAZORPAY ────────────────────────────────

  async createRazorpayOrder(
    params: CreateRazorpayOrderParams
  ): Promise<RazorpayOrderResult> {
    const { workspaceId, dealId, amount, currency, receipt, notes } = params;

    const order = await razorpay.orders.create({
      amount,
      currency:  currency.toUpperCase(),
      receipt:   receipt ?? `rcpt_${Date.now()}`,
      notes:     notes ?? {},
    });

    const payment = await prisma.payment.create({
      data: {
        workspaceId,
        dealId:          dealId ?? null,
        amount:          amount / 100,
        currency:        currency.toUpperCase(),
        status:          PaymentStatus.PENDING,
        provider:        PaymentProvider.RAZORPAY,
        providerOrderId: order.id,
        receipt:         receipt,
      },
    });

    return {
      orderId:   order.id,
      amount:    order.amount as number,
      currency:  order.currency,
      paymentId: payment.id,
    };
  },

  async handleRazorpayWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new AppError("Razorpay webhook secret is not configured.", 500);
    }

    const expected = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (expected !== signature) {
      throw new AppError("Invalid Razorpay webhook signature.", 400);
    }

    const body  = JSON.parse(rawBody.toString()) as Record<string, any>;
    const event = body.event as string;

    switch (event) {
      case "payment.captured": {
        const rzpPayment = body.payload.payment.entity;
        const payment    = await prisma.payment.findFirst({
          where: { providerOrderId: rzpPayment.order_id },
        });

        if (!payment) break;

        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status:            PaymentStatus.COMPLETED,
            providerPaymentId: rzpPayment.id,
          },
        });

        await logAuditEvent({
          workspaceId: payment.workspaceId,
          userId:      "system",
          dealId:      payment.dealId ?? undefined,
          action:      "PAYMENT_COMPLETED",
          metadata:    { provider: "RAZORPAY", amount: Number(payment.amount), currency: payment.currency },
        });

        if (payment.dealId) {
          const deal = await prisma.deal.findUnique({
            where:  { id: payment.dealId },
            select: { ownerId: true, title: true },
          });
          if (deal) {
            await NotificationService.notify(deal.ownerId, {
              workspaceId: payment.workspaceId,
              type:        "PAYMENT_COMPLETED",
              message:     `Payment received for deal: ${deal.title}`,
              metadata:    { paymentId: payment.id, amount: Number(payment.amount) },
            });
          }
        }
        break;
      }

      case "payment.failed": {
        const rzpPayment = body.payload.payment.entity;
        await prisma.payment.updateMany({
          where: { providerOrderId: rzpPayment.order_id },
          data:  { status: PaymentStatus.FAILED },
        });
        break;
      }

      case "refund.created": {
        const refund = body.payload.refund.entity;
        await prisma.payment.updateMany({
          where: { providerPaymentId: refund.payment_id },
          data:  { status: PaymentStatus.REFUNDED },
        });
        break;
      }

      default:
        console.log(`Unhandled Razorpay event: ${event}`);
    }
  },

  verifyRazorpaySignature(params: VerifyRazorpaySignatureParams): boolean {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) throw new AppError("RAZORPAY_KEY_SECRET is not set.", 500);

    const body     = `${params.orderId}|${params.paymentId}`;
    const expected = crypto
      .createHmac("sha256", keySecret)
      .update(body)
      .digest("hex");

    return expected === params.signature;
  },

  async getPaymentsForDeal(dealId: string) {
    return prisma.payment.findMany({
      where:   { dealId, status: { not: PaymentStatus.FAILED } },
      orderBy: { createdAt: "desc" },
    });
  },

  async getPaymentsForWorkspace(workspaceId: string) {
    return prisma.payment.findMany({
      where:   { workspaceId },
      orderBy: { createdAt: "desc" },
      include: { deal: { select: { title: true } } },
    });
  },
};