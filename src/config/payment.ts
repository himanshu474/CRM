// src/config/payment.ts
import Stripe from "stripe";
import Razorpay from "razorpay";

// ─────────────────────────────────────────────
// Environment Variable Validation (Fail-Fast)
// ─────────────────────────────────────────────

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY environment variable is not set.");
}

if (!razorpayKeyId || !razorpayKeySecret) {
  throw new Error(
    "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables are required."
  );
}

// ─────────────────────────────────────────────
// Stripe Client Singleton
// ─────────────────────────────────────────────

export const stripe = new Stripe(stripeSecretKey, {
  // Version pinned to ensure stability across your project
  apiVersion: "2025-03-31.basil", 
  typescript: true,
});

// ─────────────────────────────────────────────
// Razorpay Client Singleton
// ─────────────────────────────────────────────

export const razorpay = new Razorpay({
  key_id: razorpayKeyId,
  key_secret: razorpayKeySecret,
});

// ─────────────────────────────────────────────
// Webhook Secrets (Optional but Recommended)
// ─────────────────────────────────────────────

export const paymentConfig = {
  stripeWebhookSecret:   process.env.STRIPE_WEBHOOK_SECRET,
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
};
