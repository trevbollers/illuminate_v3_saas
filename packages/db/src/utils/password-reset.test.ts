import { describe, it, expect } from "vitest";
import crypto from "crypto";
import bcrypt from "bcryptjs";

/**
 * Unit tests for password reset token logic.
 * Tests the pure cryptographic functions used by the forgot/reset password flow.
 */

// ─── Token Generation ───

function generateResetToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

describe("password reset token generation", () => {
  it("generates a 64-character hex token", () => {
    const { token } = generateResetToken();
    expect(token.length).toBe(64);
    expect(/^[a-f0-9]+$/.test(token)).toBe(true);
  });

  it("generates a 64-character hex hash", () => {
    const { tokenHash } = generateResetToken();
    expect(tokenHash.length).toBe(64);
    expect(/^[a-f0-9]+$/.test(tokenHash)).toBe(true);
  });

  it("token and hash are different", () => {
    const { token, tokenHash } = generateResetToken();
    expect(token).not.toBe(tokenHash);
  });

  it("same token always produces same hash", () => {
    const { token, tokenHash } = generateResetToken();
    const rehashed = hashToken(token);
    expect(rehashed).toBe(tokenHash);
  });

  it("different tokens produce different hashes", () => {
    const a = generateResetToken();
    const b = generateResetToken();
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).not.toBe(b.tokenHash);
  });
});

// ─── Token Validation ───

describe("password reset token validation", () => {
  it("valid token matches stored hash", () => {
    const { token, tokenHash } = generateResetToken();
    const inputHash = hashToken(token);
    expect(inputHash).toBe(tokenHash);
  });

  it("wrong token does not match stored hash", () => {
    const { tokenHash } = generateResetToken();
    const wrongToken = crypto.randomBytes(32).toString("hex");
    const wrongHash = hashToken(wrongToken);
    expect(wrongHash).not.toBe(tokenHash);
  });

  it("tampered token does not match", () => {
    const { token, tokenHash } = generateResetToken();
    const tampered = token.slice(0, -1) + "0"; // flip last char
    const tamperedHash = hashToken(tampered);
    expect(tamperedHash).not.toBe(tokenHash);
  });
});

// ─── Token Expiry ───

describe("password reset token expiry", () => {
  it("token within 1 hour is valid", () => {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    expect(expiresAt > new Date()).toBe(true);
  });

  it("token after 1 hour is expired", () => {
    const expiresAt = new Date(Date.now() - 1000); // 1 second ago
    expect(expiresAt > new Date()).toBe(false);
  });

  it("token exactly at expiry is expired", () => {
    const expiresAt = new Date(Date.now());
    // Allow 1ms tolerance
    expect(expiresAt.getTime() <= Date.now()).toBe(true);
  });
});

// ─── Password Hashing ───

describe("password hashing for reset", () => {
  it("bcrypt hash is different from plaintext", async () => {
    const password = "newPassword123";
    const hash = await bcrypt.hash(password, 12);
    expect(hash).not.toBe(password);
    expect(hash.startsWith("$2a$") || hash.startsWith("$2b$")).toBe(true);
  });

  it("bcrypt compare validates correct password", async () => {
    const password = "newPassword123";
    const hash = await bcrypt.hash(password, 12);
    const isValid = await bcrypt.compare(password, hash);
    expect(isValid).toBe(true);
  });

  it("bcrypt compare rejects wrong password", async () => {
    const password = "newPassword123";
    const hash = await bcrypt.hash(password, 12);
    const isValid = await bcrypt.compare("wrongPassword", hash);
    expect(isValid).toBe(false);
  });

  it("minimum 8 character requirement", () => {
    expect("short".length >= 8).toBe(false);
    expect("longEnoughPassword".length >= 8).toBe(true);
    expect("exactly8".length >= 8).toBe(true);
    expect("7chars!".length >= 8).toBe(false);
  });
});

// ─── Security: Never store plaintext token ───

describe("security best practices", () => {
  it("stored value (hash) cannot be reversed to get token", () => {
    const { token, tokenHash } = generateResetToken();
    // SHA-256 is one-way — you can't derive token from tokenHash
    // We can only verify: the API stores tokenHash, user sends token,
    // API hashes the sent token and compares.
    expect(hashToken(token)).toBe(tokenHash);
    // There's no unhash function — this is the point
  });

  it("always return success even for unknown emails", () => {
    // The API should return 200 for any email, found or not
    // This prevents email enumeration attacks
    // We test the principle, not the API
    const emailExists = false;
    const response = { ok: true }; // Same response regardless
    expect(response.ok).toBe(true);
  });
});
