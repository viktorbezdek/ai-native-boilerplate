/**
 * Secure secret generation utilities
 */

import { randomBytes } from "node:crypto";

/**
 * Generate a cryptographically secure random string
 * Uses URL-safe base64 encoding
 */
export function generateSecret(length = 32): string {
  // Generate more bytes than needed to account for base64 expansion
  const bytes = randomBytes(Math.ceil((length * 3) / 4));
  return bytes.toString("base64url").slice(0, length);
}

/**
 * Generate a secure auth secret (48 chars for Better Auth)
 */
export function generateAuthSecret(): string {
  return generateSecret(48);
}

/**
 * Generate a cron secret (32 chars)
 */
export function generateCronSecret(): string {
  return generateSecret(32);
}

/**
 * Validate that a secret meets minimum requirements
 */
export function validateSecret(secret: string, minLength = 32): boolean {
  return (
    typeof secret === "string" &&
    secret.length >= minLength &&
    !secret.includes(" ") &&
    !/^(your-|example|test|demo)/i.test(secret)
  );
}

/**
 * Validate Better Auth secret specifically
 */
export function validateAuthSecret(secret: string): {
  valid: boolean;
  error?: string;
} {
  if (!secret) {
    return { valid: false, error: "Secret is required" };
  }
  if (secret.length < 32) {
    return { valid: false, error: "Secret must be at least 32 characters" };
  }
  if (/^(your-|example|test|demo)/i.test(secret)) {
    return { valid: false, error: "Secret appears to be a placeholder" };
  }
  return { valid: true };
}
