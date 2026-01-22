/**
 * CSRF Protection utilities for API routes
 * Uses double-submit cookie pattern with origin validation
 *
 * Note: This module is framework-agnostic. Cookie operations should be
 * handled by the consuming application using the cookie adapter pattern.
 */

export const CSRF_TOKEN_NAME = "csrf_token";
export const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomUUID();
}

/**
 * Cookie adapter interface for framework-specific cookie handling
 */
export interface CookieAdapter {
  get(name: string): string | undefined;
  set(name: string, value: string, options: CookieOptions): void;
}

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "strict" | "lax" | "none";
  path: string;
  maxAge: number;
}

/**
 * Set CSRF token cookie using the provided cookie adapter
 */
export function setCsrfToken(
  cookies: CookieAdapter,
  isProduction = process.env.NODE_ENV === "production"
): string {
  const token = generateCsrfToken();

  cookies.set(CSRF_TOKEN_NAME, token, {
    httpOnly: false, // Needs to be readable by client JS
    secure: isProduction,
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
export function validateCsrfToken(
  cookies: CookieAdapter,
  headerToken: string | null
): boolean {
  const cookieToken = cookies.get(CSRF_TOKEN_NAME);

  if (!cookieToken || !headerToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(cookieToken, headerToken);
}

/**
 * Validate request origin against allowed origins
 */
export function validateOrigin(
  origin: string | null,
  referer: string | null,
  host: string | null,
  appUrl?: string
): boolean {
  const allowedOrigins = [appUrl, `https://${host}`, `http://${host}`].filter(
    Boolean
  );

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
export function validateCsrf(
  method: string,
  cookies: CookieAdapter,
  headers: {
    csrfToken: string | null;
    origin: string | null;
    referer: string | null;
    host: string | null;
  },
  appUrl?: string
): CsrfValidationResult {
  // Only validate for state-changing methods
  if (["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) {
    return { valid: true };
  }

  // Validate origin
  if (!validateOrigin(headers.origin, headers.referer, headers.host, appUrl)) {
    return { valid: false, error: "Invalid origin" };
  }

  // Validate CSRF token
  if (!validateCsrfToken(cookies, headers.csrfToken)) {
    return { valid: false, error: "Invalid CSRF token" };
  }

  return { valid: true };
}
