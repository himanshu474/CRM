// src/utils/payment/razorpay.utils.ts — NEW
import crypto from "crypto";

/**
 * Verifies the Razorpay payment signature.
 * Called after the user completes checkout to confirm the payment is genuine.
 *
 * Razorpay signs: orderId + "|" + paymentId
 * using HMAC-SHA256 with your key_secret.
 */
export const verifyRazorpaySignature = (params: {
  orderId:   string;
  paymentId: string;
  signature: string;
}): boolean => {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keySecret) {
    throw new Error("RAZORPAY_KEY_SECRET is not set");
  }

  const body     = `${params.orderId}|${params.paymentId}`;
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(body)
    .digest("hex");

  return expected === params.signature;
};

/**
 * Verifies the Razorpay webhook signature.
 * Called in the webhook handler before processing any event.
 */
export const verifyRazorpayWebhookSignature = (
  rawBody:   Buffer,
  signature: string
): boolean => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("RAZORPAY_WEBHOOK_SECRET is not set");
  }

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  return expected === signature;
};