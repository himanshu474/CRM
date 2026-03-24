import crypto from "crypto";
import { Request } from "express";

export const generateFingerprint = (req: Request) => {
  const raw = `${req.ip}-${req.headers["user-agent"]}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
};