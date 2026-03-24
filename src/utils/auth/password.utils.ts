import bcrypt from "bcrypt";

const SALT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;

/**
 * Hash password
 */
export const hashPassword = async (password: string) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compare password
 */
export const comparePassword = async (
  password: string,
  hash: string
) => {
  return bcrypt.compare(password, hash);
};