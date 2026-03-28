import crypto from "crypto";
import bcrypt from "bcryptjs";

const CODE_LENGTH = 6;
const CODE_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 min between sends to same identifier

/**
 * Generate a random 6-digit numeric code.
 */
export function generateCode(): string {
  // crypto.randomInt gives a uniform random int — no modulo bias
  return String(crypto.randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
}

/**
 * Hash a code for storage (we never store plaintext).
 */
export async function hashCode(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

/**
 * Verify a code against its hash.
 */
export async function verifyCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}

/**
 * Get expiry date for a new code.
 */
export function getCodeExpiry(): Date {
  return new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);
}

/**
 * Check if a new code can be sent (rate limiting).
 * Returns true if enough time has passed since the last code was sent.
 */
export function canSendNewCode(lastCodeCreatedAt: Date | null): boolean {
  if (!lastCodeCreatedAt) return true;
  return Date.now() - lastCodeCreatedAt.getTime() > RATE_LIMIT_WINDOW_MS;
}

export { CODE_LENGTH, CODE_EXPIRY_MINUTES, MAX_ATTEMPTS, RATE_LIMIT_WINDOW_MS };
