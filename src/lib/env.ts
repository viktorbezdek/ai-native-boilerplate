import { z } from "zod";

/**
 * Server-side environment variables schema
 */
const serverSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

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

  // Node environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
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

/**
 * Validate server environment variables
 */
function validateServerEnv(): ServerEnv {
  const parsed = serverSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      "❌ Invalid server environment variables:",
      parsed.error.flatten().fieldErrors
    );
    throw new Error("Invalid server environment variables");
  }

  return parsed.data;
}

/**
 * Validate client environment variables
 */
function validateClientEnv(): ClientEnv {
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

  return parsed.data;
}

// Export validated environment variables
export const serverEnv = validateServerEnv();
export const clientEnv = validateClientEnv();

// Type-safe environment access
export const env = {
  ...serverEnv,
  ...clientEnv,
} satisfies Env;
