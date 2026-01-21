/**
 * API Route Middleware
 * Provides rate limiting and CSRF protection for API routes
 */

import { type CsrfValidationResult, validateCsrf } from "@/lib/utils/csrf";
import {
  RATE_LIMITS,
  type RateLimitConfig,
  checkRateLimit,
  getClientIp,
  getRateLimitHeaders,
} from "@/lib/utils/rate-limit";
import { NextResponse } from "next/server";

export interface ApiMiddlewareConfig {
  /** Rate limit configuration (default: standard) */
  rateLimit?: RateLimitConfig | keyof typeof RATE_LIMITS;
  /** Whether to require CSRF validation for state-changing requests (default: true) */
  csrf?: boolean;
  /** Route prefix for rate limiting namespacing */
  routePrefix?: string;
}

export interface ApiMiddlewareResult {
  success: boolean;
  error?: NextResponse;
  headers?: HeadersInit;
}

/**
 * Apply API middleware (rate limiting + CSRF) to a request
 */
export async function applyApiMiddleware(
  request: Request,
  config: ApiMiddlewareConfig = {}
): Promise<ApiMiddlewareResult> {
  const { rateLimit = "standard", csrf = true, routePrefix = "api" } = config;

  // Get rate limit config
  const rateLimitConfig: RateLimitConfig =
    typeof rateLimit === "string"
      ? { ...RATE_LIMITS[rateLimit], prefix: routePrefix }
      : { ...rateLimit, prefix: routePrefix };

  // Check rate limit
  const clientIp = getClientIp(request);
  const rateLimitResult = checkRateLimit(clientIp, rateLimitConfig);

  if (!rateLimitResult.success) {
    return {
      success: false,
      error: NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      ),
    };
  }

  // Check CSRF for state-changing methods
  if (csrf) {
    const csrfResult: CsrfValidationResult = await validateCsrf(request);
    if (!csrfResult.valid) {
      return {
        success: false,
        error: NextResponse.json(
          { error: csrfResult.error ?? "CSRF validation failed" },
          { status: 403 }
        ),
      };
    }
  }

  return {
    success: true,
    headers: getRateLimitHeaders(rateLimitResult),
  };
}

/**
 * Create a response with rate limit headers
 */
export function withRateLimitHeaders(
  response: NextResponse,
  headers?: HeadersInit
): NextResponse {
  if (headers) {
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }
  return response;
}

/**
 * Higher-order function to wrap an API handler with middleware
 */
export function withApiMiddleware<T extends Request>(
  handler: (request: T) => Promise<Response>,
  config: ApiMiddlewareConfig = {}
) {
  return async (request: T): Promise<Response> => {
    const middlewareResult = await applyApiMiddleware(request, config);

    if (!middlewareResult.success && middlewareResult.error) {
      return middlewareResult.error;
    }

    const response = await handler(request);

    // Add rate limit headers to successful response
    if (middlewareResult.headers && response instanceof NextResponse) {
      return withRateLimitHeaders(response, middlewareResult.headers);
    }

    return response;
  };
}
