/**
 * Service health checks for setup verification
 */

import type { CheckResult } from "./ui";

export interface ServiceCheckResult extends CheckResult {
  latency?: number;
}

/**
 * Check database connectivity
 */
export async function checkDatabase(
  databaseUrl: string
): Promise<ServiceCheckResult> {
  if (!databaseUrl) {
    return {
      name: "Database",
      status: "fail",
      message: "DATABASE_URL not configured",
    };
  }

  const start = performance.now();

  try {
    // For local Docker PostgreSQL, use pg directly
    if (databaseUrl.includes("localhost")) {
      const { $ } = await import("bun");
      await $`docker exec ainative-postgres pg_isready -U postgres`.quiet();
      const latency = Math.round(performance.now() - start);
      return {
        name: "Database",
        status: "pass",
        message: `latency: ${latency}ms`,
        latency,
      };
    }

    // For Neon, make a simple HTTP request to test connectivity
    // We can't import the actual neon package here without proper setup
    // So we just validate the URL format for now
    if (
      databaseUrl.startsWith("postgresql://") ||
      databaseUrl.startsWith("postgres://")
    ) {
      const latency = Math.round(performance.now() - start);
      return {
        name: "Database",
        status: "pass",
        message: "URL configured",
        latency,
      };
    }

    return {
      name: "Database",
      status: "fail",
      message: "Invalid DATABASE_URL format",
    };
  } catch (e) {
    return {
      name: "Database",
      status: "fail",
      message: e instanceof Error ? e.message : "Connection failed",
    };
  }
}

/**
 * Check Stripe API connectivity
 */
export async function checkStripe(
  secretKey: string | undefined
): Promise<ServiceCheckResult> {
  if (!secretKey) {
    return {
      name: "Stripe",
      status: "skip",
      message: "not configured",
    };
  }

  const start = performance.now();

  try {
    const response = await fetch("https://api.stripe.com/v1/balance", {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });

    const latency = Math.round(performance.now() - start);

    if (response.ok) {
      return {
        name: "Stripe",
        status: "pass",
        message: `latency: ${latency}ms`,
        latency,
      };
    }

    if (response.status === 401) {
      return {
        name: "Stripe",
        status: "fail",
        message: "Invalid API key",
      };
    }

    return {
      name: "Stripe",
      status: "fail",
      message: `API error: ${response.status}`,
    };
  } catch (e) {
    return {
      name: "Stripe",
      status: "fail",
      message: e instanceof Error ? e.message : "Connection failed",
    };
  }
}

/**
 * Check Resend API connectivity
 */
export async function checkResend(
  apiKey: string | undefined
): Promise<ServiceCheckResult> {
  if (!apiKey) {
    return {
      name: "Resend",
      status: "skip",
      message: "not configured",
    };
  }

  const start = performance.now();

  try {
    const response = await fetch("https://api.resend.com/domains", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const latency = Math.round(performance.now() - start);

    if (response.ok) {
      return {
        name: "Resend",
        status: "pass",
        message: `latency: ${latency}ms`,
        latency,
      };
    }

    if (response.status === 401) {
      return {
        name: "Resend",
        status: "fail",
        message: "Invalid API key",
      };
    }

    return {
      name: "Resend",
      status: "fail",
      message: `API error: ${response.status}`,
    };
  } catch (e) {
    return {
      name: "Resend",
      status: "fail",
      message: e instanceof Error ? e.message : "Connection failed",
    };
  }
}

/**
 * Check PostHog connectivity (optional)
 */
export async function checkPostHog(
  projectKey: string | undefined,
  host: string | undefined
): Promise<ServiceCheckResult> {
  if (!projectKey) {
    return {
      name: "PostHog",
      status: "skip",
      message: "not configured",
    };
  }

  // PostHog doesn't have a simple API to validate keys
  // Just verify the key format
  if (projectKey.startsWith("phc_")) {
    return {
      name: "PostHog",
      status: "pass",
      message: "configured",
    };
  }

  return {
    name: "PostHog",
    status: "fail",
    message: "Invalid project key format",
  };
}

/**
 * Check Sentry connectivity (optional)
 */
export async function checkSentry(
  dsn: string | undefined
): Promise<ServiceCheckResult> {
  if (!dsn) {
    return {
      name: "Sentry",
      status: "skip",
      message: "not configured",
    };
  }

  // Validate DSN format
  try {
    const url = new URL(dsn);
    if (url.hostname.includes("sentry")) {
      return {
        name: "Sentry",
        status: "pass",
        message: "configured",
      };
    }
    return {
      name: "Sentry",
      status: "fail",
      message: "Invalid DSN format",
    };
  } catch {
    return {
      name: "Sentry",
      status: "fail",
      message: "Invalid DSN format",
    };
  }
}

/**
 * Check Mailpit connectivity (local email)
 */
export async function checkMailpit(): Promise<ServiceCheckResult> {
  const start = performance.now();

  try {
    const response = await fetch("http://localhost:8025/api/v1/info");
    const latency = Math.round(performance.now() - start);

    if (response.ok) {
      return {
        name: "Mailpit",
        status: "pass",
        message: `latency: ${latency}ms`,
        latency,
      };
    }

    return {
      name: "Mailpit",
      status: "fail",
      message: `HTTP ${response.status}`,
    };
  } catch {
    return {
      name: "Mailpit",
      status: "skip",
      message: "not running (local email disabled)",
    };
  }
}

/**
 * Run all service checks
 */
export async function checkAllServices(
  env: Record<string, string | undefined>
): Promise<ServiceCheckResult[]> {
  const results = await Promise.all([
    checkDatabase(env.DATABASE_URL || ""),
    checkStripe(env.STRIPE_SECRET_KEY),
    checkResend(env.RESEND_API_KEY),
    checkPostHog(env.NEXT_PUBLIC_POSTHOG_KEY, env.NEXT_PUBLIC_POSTHOG_HOST),
    checkSentry(env.SENTRY_DSN),
    checkMailpit(),
  ]);

  return results;
}
