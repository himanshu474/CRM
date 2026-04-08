import type { Request, Response } from "express";
import { asyncHandler }           from "../utils/common/asyncHandler.js";
import { PaymentService }         from "../services/payment.service.js";
import { AppError }               from "../utils/AppError.js";
import {Req} from "../types/express.js"

export const PaymentController = {

  // POST /api/workspaces/:workspaceId/payments/stripe/intent
  createStripeIntent: asyncHandler(async (req: Req, res: Response) => {
    const { workspaceId } = req.params;
    const { dealId, amount, currency = "USD", description } = req.body;

    if (!amount || amount <= 0) {
      throw new AppError("A valid amount is required.", 400);
    }

    const result = await PaymentService.createStripePaymentIntent({
      workspaceId,
      dealId,
      amount:      Math.round(amount * 100), // convert to cents
      currency,
      description,
    });

    res.status(201).json({
      success: true,
      message: "Stripe payment intent created",
      data:    result,
    });
  }),

  // POST /api/workspaces/:workspaceId/payments/razorpay/order
  createRazorpayOrder: asyncHandler(async (req: Req, res: Response) => {
    const { workspaceId } = req.params;
    const { dealId, amount, currency = "INR", receipt, notes } = req.body;

    if (!amount || amount <= 0) {
      throw new AppError("A valid amount is required.", 400);
    }

    const result = await PaymentService.createRazorpayOrder({
      workspaceId,
      dealId,
      amount:   Math.round(amount * 100), // convert to paise
      currency,
      receipt,
      notes,
    });

    res.status(201).json({
      success: true,
      message: "Razorpay order created",
      data:    result,
    });
  }),

  // POST /api/payments/razorpay/verify
  // Called from frontend after Razorpay checkout completes
  verifyRazorpayPayment: asyncHandler(async (req: Request, res: Response) => {
    const { orderId, paymentId, signature } = req.body;

    const isValid = PaymentService.verifyRazorpaySignature({
      orderId,
      paymentId,
      signature,
    });

    if (!isValid) {
      throw new AppError("Payment verification failed. Invalid signature.", 400);
    }

    res.json({
      success: true,
      message: "Payment verified successfully",
    });
  }),

  // POST /api/webhooks/stripe
  // Raw body required — do NOT parse with express.json() on this route
  stripeWebhook: asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"] as string;

    if (!signature) {
      throw new AppError("Missing Stripe webhook signature header.", 400);
    }

    await PaymentService.handleStripeWebhook(req.body as Buffer, signature);

    res.json({ received: true });
  }),

  // POST /api/webhooks/razorpay
  razorpayWebhook: asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers["x-razorpay-signature"] as string;

    if (!signature) {
      throw new AppError("Missing Razorpay webhook signature header.", 400);
    }

    await PaymentService.handleRazorpayWebhook(req.body as Buffer, signature);

    res.json({ received: true });
  }),

  // GET /api/workspaces/:workspaceId/payments
  getWorkspacePayments: asyncHandler(async (req: Req, res: Response) => {
    const { workspaceId } = req.params;

    const payments = await PaymentService.getPaymentsForWorkspace(workspaceId);

    res.json({
      success: true,
      data:    payments,
      message: "Payments retrieved",
    });
  }),

  // GET /api/workspaces/:workspaceId/deals/:dealId/payments
  getDealPayments: asyncHandler(async (req: Req, res: Response) => {
    const { dealId } = req.params;

    const payments = await PaymentService.getPaymentsForDeal(dealId);

    res.json({
      success: true,
      data:    payments,
      message: "Deal payments retrieved",
    });
  }),
};