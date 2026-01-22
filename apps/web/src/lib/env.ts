import { z } from "zod";

/**
 * Server-side environment variables schema
 * DATABASE_URL is optional in CI/test - neon.new can provision instant databases
 */
const serverSchema = z.object({
  // Database - optional in CI/test, required in production
  DATABASE_URL: z
    .string()
    .url()
    .optional()
    .refine(
      (val) => {
        // Required in production
        if (process.env.NODE_ENV === "production") {
          return !!val;
        }
        // Optional in development/test (neon.new can provision)
        return true;
      },
      { message: "DATABASE_URL is required in production" }
    ),

  // Authentication
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Payments
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  STRIPE_PRO_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_PRO_YEARLY_PRICE_ID: z.string().optional(),
  STRIPE_TEAM_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_TEAM_YEARLY_PRICE_ID: z.string().optional(),

  // Email
  RESEND_API_KEY: z.string().startsWith("re_"),
  FROM_EMAIL: z.string().email(),
  FROM_NAME: z.string().optional(),

  // Error tracking
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),

  // Cron jobs
  CRON_SECRET: z.string().min(16).optional(),

  // Node environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

/**
 * Client-side environment variables schema
 */
const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().startsWith("phc_").optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_").optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
});

/**
 * Combined schema for all environment variables
 */
const envSchema = serverSchema.merge(clientSchema);

type ServerEnv = z.infer<typeof serverSchema>;
type ClientEnv = z.infer<typeof clientSchema>;
type Env = z.infer<typeof envSchema>;

// Cache for validated env
let cachedServerEnv: ServerEnv | null = null;
let cachedClientEnv: ClientEnv | null = null;

/**
 * Validate server environment variables (lazy)
 */
function validateServerEnv(): ServerEnv {
  // Skip validation during build
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    return {} as ServerEnv;
  }

  if (cachedServerEnv) {
    return cachedServerEnv;
  }

  const parsed = serverSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      "❌ Invalid server environment variables:",
      parsed.error.flatten().fieldErrors
    );
    throw new Error("Invalid server environment variables");
  }

  cachedServerEnv = parsed.data;
  return parsed.data;
}

/**
 * Validate client environment variables (lazy)
 */
function validateClientEnv(): ClientEnv {
  // Skip validation during build
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    return {} as ClientEnv;
  }

  if (cachedClientEnv) {
    return cachedClientEnv;
  }

  const clientEnv = {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  };

  const parsed = clientSchema.safeParse(clientEnv);

  if (!parsed.success) {
    console.error(
      "❌ Invalid client environment variables:",
      parsed.error.flatten().fieldErrors
    );
    throw new Error("Invalid client environment variables");
  }

  cachedClientEnv = parsed.data;
  return parsed.data;
}

/**
 * Get server environment variables
 * Validates on first access, caches result
 */
export function getServerEnv(): ServerEnv {
  return validateServerEnv();
}

/**
 * Get client environment variables
 * Validates on first access, caches result
 */
export function getClientEnv(): ClientEnv {
  return validateClientEnv();
}

/**
 * Get all environment variables
 * @deprecated Use getServerEnv() or getClientEnv() for better tree-shaking
 */
export function getEnv(): Env {
  return {
    ...getServerEnv(),
    ...getClientEnv(),
  };
}
