import crypto from "crypto";
import { AppError } from "../AppError.js";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

/**
 * Pre-computed bcrypt hash used to normalize login response timing
 * when the requested email doesn't exist in the database.
 * This prevents timing attacks that could enumerate valid emails.
 *
 * NOT a secret. Generate your own with:
 *   const bcrypt = require("bcrypt");
 *   const crypto = require("crypto");
 *   console.log(await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12));
 */
export const DUMMY_BCRYPT_HASH =
  "$2b$12$LKhj9qQoVHoEjZMZEjZMORTVqKVfX5mUlqYyqLmwuALyxMGfDFRWsY";

// ─────────────────────────────────────────────
// Tokens
// ─────────────────────────────────────────────

/**
 * Generate a cryptographically secure random token.
 * 64 bytes = 128 hex chars = 512 bits of entropy.
 * Used for refresh tokens, email verification, password reset.
 */
export const generateSecureToken = (): string => {
  return crypto.randomBytes(64).toString("hex");
};

/**
 * Hash a token with SHA-256 for safe DB storage.
 * The raw token is sent to the user; only the hash is stored.
 * If the DB is compromised, hashed tokens cannot be replayed.
 */
export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

// ─────────────────────────────────────────────
// Encryption (AES-256-GCM)
// ─────────────────────────────────────────────

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;        // 128-bit IV — standard for GCM
const AUTH_TAG_LENGTH = 16;  // 128-bit auth tag — GCM default

/**
 * Validates the encryption key exists and is the correct length (32 bytes = 64 hex chars).
 * Called once at startup so misconfiguration fails fast rather than at runtime.
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;

  if (!keyHex) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }
  if (keyHex.length !== 64) {
    throw new Error(
      `ENCRYPTION_KEY must be 64 hex characters (32 bytes). Got ${keyHex.length} characters.`
    );
  }

  return Buffer.from(keyHex, "hex");
}

/**
 * Encrypt plaintext using AES-256-GCM.
 *
 * ✅ GCM over CTR because:
 *   - CTR provides confidentiality only — no integrity check.
 *     A tampered ciphertext decrypts silently to garbage.
 *   - GCM = CTR + GMAC authentication tag.
 *     Tampered ciphertext throws on decrypt instead of silently corrupting data.
 *
 * Output format: <iv_hex>:<authTag_hex>:<ciphertext_hex>
 */
export const encrypt = (text: string): string => {
  const key = getEncryptionKey();
  const iv  = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  }) as crypto.CipherGCM;

  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Store iv + authTag + ciphertext — all three are needed for decryption
  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
};

/**
 * Decrypt AES-256-GCM ciphertext produced by encrypt().
 * Throws if the ciphertext has been tampered with (auth tag mismatch).
 */
export const decrypt = (hash: string): string => {
  const parts = hash.split(":");

  // ✅ Validate format before trying to use the parts
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted payload format");
  }

  const [ivHex, authTagHex, contentHex] = parts;
  const key = getEncryptionKey();

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivHex, "hex"),
    { authTagLength: AUTH_TAG_LENGTH }
  ) as crypto.DecipherGCM;

  // ✅ Set auth tag — GCM will verify integrity during decipher.final()
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  try {
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(contentHex, "hex")),
      decipher.final(), // ← throws if auth tag doesn't match (tampered data)
    ]);

    return decrypted.toString("utf8");
  } catch {
    // Don't leak internal crypto error details to the caller
    throw new AppError("Decryption failed: payload may have been tampered with", 400);
  }
};

// ─────────────────────────────────────────────
// Key generation helper (run once, paste output into .env)
// ─────────────────────────────────────────────

/**
 * Call this once from a script to generate a secure ENCRYPTION_KEY.
 * Never call this at runtime — key must stay stable across deployments.
 *
 *   npx ts-node -e "import { generateEncryptionKey } from './crypto.utils'; generateEncryptionKey();"
 */
export const generateEncryptionKey = (): void => {
  const key = crypto.randomBytes(32).toString("hex");
  console.log("Add this to your .env file:");
  console.log(`ENCRYPTION_KEY=${key}`);
};