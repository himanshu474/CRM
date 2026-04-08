// src/routes/payment.routes.ts
import { Router }             from "express";
import express                from "express";
import { PaymentController }  from "../controllers/payment.controller.js";
import { protect }            from "../middlewares/auth.middleware.js";
import { authorize }          from "../middlewares/access.middleware.js";

// ─────────────────────────────────────────────
// Webhook routes — mounted separately in app.ts
// MUST use express.raw() so PaymentService can verify the raw body signature.
// express.json() would parse the body and break signature verification.
// ─────────────────────────────────────────────

export const webhookRouter = Router();

webhookRouter.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  PaymentController.stripeWebhook
);

webhookRouter.post(
  "/razorpay",
  express.raw({ type: "application/json" }),
  PaymentController.razorpayWebhook
);

// ─────────────────────────────────────────────
// Workspace-scoped payment routes — mounted under /workspaces/:workspaceId
// ─────────────────────────────────────────────

export const paymentRouter = Router({ mergeParams: true });

paymentRouter.use(protect, authorize);

// Create payment intents / orders
paymentRouter.post("/payments/stripe/intent", PaymentController.createStripeIntent);
paymentRouter.post("/payments/razorpay/order", PaymentController.createRazorpayOrder);

// List payments
paymentRouter.get("/payments",                  PaymentController.getWorkspacePayments);
paymentRouter.get("/deals/:dealId/payments",    PaymentController.getDealPayments);

// Razorpay frontend verification (workspace context not needed)
paymentRouter.post("/payments/razorpay/verify", PaymentController.verifyRazorpayPayment);