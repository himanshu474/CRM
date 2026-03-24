import crypto from "crypto";

/**
 * Generate secure random token
 */
export const generateSecureToken = () => {
  return crypto.randomBytes(64).toString("hex");
};

/**
 * Hash token (SHA-256)
 */
export const hashToken = (token: string) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * Encrypt data (AES-256)
 */
export const encrypt = (text: string) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    "aes-256-ctr",
    Buffer.from(process.env.ENCRYPTION_KEY!, "hex"),
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(text),
    cipher.final(),
  ]);

  return iv.toString("hex") + ":" + encrypted.toString("hex");
};

/**
 * Decrypt data
 */
export const decrypt = (hash: string) => {
  const [ivHex, contentHex] = hash.split(":");

  const decipher = crypto.createDecipheriv(
    "aes-256-ctr",
    Buffer.from(process.env.ENCRYPTION_KEY!, "hex"),
    Buffer.from(ivHex, "hex")
  );

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(contentHex, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString();
};