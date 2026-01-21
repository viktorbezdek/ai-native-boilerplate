/**
 * Simple in-memory rate limiter for API routes
 * Uses a sliding window approach with IP-based tracking
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup(): void {
  if (cleanupTimer) {
    return;
  }
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
}

export interface RateLimitConfig {
  /** Time window in seconds */
  window: number;
  /** Maximum requests per window */
  max: number;
  /** Optional key prefix for namespacing */
  prefix?: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check rate limit for a given identifier (usually IP address)
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  startCleanup();

  const { window, max, prefix = "rl" } = config;
  const key = `${prefix}:${identifier}`;
  const now = Date.now();
  const windowMs = window * 1000;

  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    // First request or window expired
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      success: true,
      limit: max,
      remaining: max - 1,
      reset: Math.ceil((now + windowMs) / 1000),
    };
  }

  if (entry.count >= max) {
    return {
      success: false,
      limit: max,
      remaining: 0,
      reset: Math.ceil(entry.resetAt / 1000),
    };
  }

  entry.count++;
  return {
    success: true,
    limit: max,
    remaining: max - entry.count,
    reset: Math.ceil(entry.resetAt / 1000),
  };
}

/**
 * Rate limit middleware helper for Next.js API routes
 */
export function getRateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.reset.toString(),
  };
}

/**
 * Extract client IP from request headers
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

// Default rate limit configs for different route types
export const RATE_LIMITS = {
  /** Standard API routes: 100 requests per minute */
  standard: { window: 60, max: 100 } as const,
  /** Auth routes: 20 requests per minute */
  auth: { window: 60, max: 20 } as const,
  /** Webhook routes: 500 requests per minute */
  webhook: { window: 60, max: 500 } as const,
  /** Strict routes: 10 requests per minute */
  strict: { window: 60, max: 10 } as const,
} as const;
