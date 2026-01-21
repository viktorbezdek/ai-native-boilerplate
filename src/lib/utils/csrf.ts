/**
 * CSRF Protection utilities for API routes
 * Uses double-submit cookie pattern with origin validation
 */

import { cookies } from "next/headers";

const CSRF_TOKEN_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomUUID();
}

/**
 * Set CSRF token cookie
 */
export async function setCsrfToken(): Promise<string> {
  const token = generateCsrfToken();
  const cookieStore = await cookies();

  cookieStore.set(CSRF_TOKEN_NAME, token, {
    httpOnly: false, // Needs to be readable by client JS
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return token;
}

/**
 * Validate CSRF token from request
 * Uses double-submit cookie pattern: token in cookie must match token in header
 */
export async function validateCsrfToken(request: Request): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_TOKEN_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(cookieToken, headerToken);
}

/**
 * Validate request origin against allowed origins
 */
export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    `https://${host}`,
    `http://${host}`,
  ].filter(Boolean);

  // For same-origin requests, origin might be null
  if (!origin && !referer) {
    // Allow same-origin requests (no origin header typically means same-origin)
    return true;
  }

  if (origin) {
    return allowedOrigins.some((allowed) => origin === allowed);
  }

  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return allowedOrigins.some((allowed) => refererUrl.origin === allowed);
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * CSRF validation result
 */
export interface CsrfValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Full CSRF validation for state-changing requests
 * Validates both origin and CSRF token
 */
export async function validateCsrf(
  request: Request
): Promise<CsrfValidationResult> {
  // Only validate for state-changing methods
  const method = request.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return { valid: true };
  }

  // Validate origin
  if (!validateOrigin(request)) {
    return { valid: false, error: "Invalid origin" };
  }

  // Validate CSRF token
  if (!(await validateCsrfToken(request))) {
    return { valid: false, error: "Invalid CSRF token" };
  }

  return { valid: true };
}
