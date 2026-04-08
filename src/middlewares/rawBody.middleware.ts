// src/middlewares/rawBody.middleware.ts — NEW
import express, { Request, Response, NextFunction } from "express";

/**
 * Raw body middleware — applied only to webhook routes.
 *
 * Stripe and Razorpay verify their webhook signatures against
 * the raw unmodified request body bytes. express.json() parses
 * and re-serialises the body, which changes the byte sequence
 * and breaks HMAC verification.
 *
 * Usage: mount this BEFORE express.json() in app.ts.
 * Already applied via webhookRouter in payment.route.ts.
 */
export const rawBody = express.raw({ type: "application/json" });