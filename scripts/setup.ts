#!/usr/bin/env bun
/**
 * AI-Native Boilerplate Setup Script
 *
 * Automated local development setup for fast and seamless onboarding.
 *
 * Usage:
 *   bun setup          # Interactive mode (default)
 *   bun setup --quick  # Quick setup with external services
 *   bun setup --local  # Full local setup with Docker
 *   bun setup --instagres  # Instant Neon database (no account required)
 *   bun setup --ci     # CI mode (non-interactive)
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import * as p from "@clack/prompts";
import {
  checkDockerRunning,
  printPrerequisitesResults,
  validatePrerequisites,
} from "./lib/prerequisites";
import {
  generateAuthSecret,
  generateCronSecret,
  validateAuthSecret,
} from "./lib/secrets";
import {
  banner,
  colors,
  divider,
  error,
  info,
  link,
  mask,
  section,
  success,
  table,
  warning,
} from "./lib/ui";

const ROOT_DIR = resolve(import.meta.dir, "..");
const ENV_FILE = resolve(ROOT_DIR, ".env.local");
const ENV_EXAMPLE = resolve(ROOT_DIR, ".env.example");
const SEED_FILE = resolve(ROOT_DIR, "packages/database/seed.sql");

type SetupMode = "quick" | "local" | "instagres" | "ci";

interface SetupOptions {
  mode: SetupMode;
  skipDocker: boolean;
}

interface EnvConfig {
  // Core
  NEXT_PUBLIC_APP_URL: string;
  // Database
  DATABASE_URL: string;
  DATABASE_CLAIM_URL?: string;
  // Auth
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  // Stripe (optional)
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;
  // Email (optional)
  RESEND_API_KEY?: string;
  FROM_EMAIL?: string;
  FROM_NAME?: string;
  // Analytics (optional)
  NEXT_PUBLIC_POSTHOG_KEY?: string;
  NEXT_PUBLIC_POSTHOG_HOST?: string;
  // Error tracking (optional)
  SENTRY_DSN?: string;
  // Cron
  CRON_SECRET?: string;
}

function parseArgs(): SetupOptions {
  const args = process.argv.slice(2);
  let mode: SetupMode = "instagres";
  let skipDocker = false;

  for (const arg of args) {
    if (arg === "--quick") mode = "quick";
    else if (arg === "--local") mode = "local";
    else if (arg === "--instagres") mode = "instagres";
    else if (arg === "--ci") mode = "ci";
    else if (arg === "--skip-docker") skipDocker = true;
    else if (arg === "--help" || arg === "-h") {
      console.log(`
AI-Native Boilerplate Setup

Usage:
  bun setup [options]

Options:
  --instagres    Instant Neon database - no account required (default)
  --quick        Quick setup with your own Neon database URL
  --local        Full local setup with Docker (PostgreSQL, Mailpit)
  --ci           CI mode - non-interactive, uses environment variables
  --skip-docker  Skip Docker setup even in local mode
  --help, -h     Show this help message

Database expires after 72 hours with --instagres. Claim it to keep: neondb claim
`);
      process.exit(0);
    }
  }

  return { mode, skipDocker };
}

async function selectMode(): Promise<SetupMode> {
  const result = await p.select({
    message: "Select setup mode:",
    options: [
      {
        value: "instagres" as const,
        label: "Instant Database (Recommended)",
        hint: "No account needed - database in 5 seconds via neon.new",
      },
      {
        value: "quick" as const,
        label: "Your Neon Database",
        hint: "Use your own Neon account and DATABASE_URL",
      },
      {
        value: "local" as const,
        label: "Full Local (Docker)",
        hint: "Docker-based PostgreSQL and local email",
      },
      {
        value: "ci" as const,
        label: "CI Mode",
        hint: "Minimal setup for continuous integration",
      },
    ],
  });

  if (p.isCancel(result)) {
    p.cancel("Setup cancelled.");
    process.exit(1);
  }

  return result;
}

async function provisionInstagresDatabase(): Promise<{
  databaseUrl: string;
  claimUrl?: string;
}> {
  const { $ } = await import("bun");

  info("Provisioning instant Neon database via neon.new...");
  info(colors.dim("No account required - database ready in seconds"));

  try {
    // Check if seed file exists
    const seedArg = existsSync(SEED_FILE) ? `--seed ${SEED_FILE}` : "";
    if (existsSync(SEED_FILE)) {
      info(`Seeding database with: ${colors.dim(SEED_FILE)}`);
    }

    // Use get-db CLI to provision database
    // Output goes to stdout, we need to capture it
    const envPath = resolve(ROOT_DIR, ".env.instagres.tmp");
    const cmd = seedArg
      ? `npx -y get-db --yes --env ${envPath} ${seedArg}`
      : `npx -y get-db --yes --env ${envPath}`;

    await $`${{ raw: cmd }}`.quiet();

    // Read the generated env file
    if (!existsSync(envPath)) {
      throw new Error("get-db did not create environment file");
    }

    const envContent = readFileSync(envPath, "utf-8");
    const lines = envContent.split("\n");

    let databaseUrl = "";
    let claimUrl: string | undefined;

    for (const line of lines) {
      if (line.startsWith("DATABASE_URL=")) {
        databaseUrl = line.replace("DATABASE_URL=", "").trim();
      }
      if (
        line.startsWith("PUBLIC_CLAIM_URL=") ||
        line.startsWith("CLAIM_URL=")
      ) {
        claimUrl = line.split("=").slice(1).join("=").trim();
      }
    }

    // Clean up temp file
    const { unlinkSync } = await import("node:fs");
    unlinkSync(envPath);

    if (!databaseUrl) {
      throw new Error("Could not extract DATABASE_URL from get-db output");
    }

    success("Instant database provisioned!");
    if (claimUrl) {
      info(`Claim URL (save for later): ${colors.cyan(claimUrl)}`);
    }
    warning("Database expires in 72 hours. Run 'npx get-db claim' to keep it.");

    return { databaseUrl, claimUrl };
  } catch (e) {
    error(`Failed to provision database: ${e}`);
    info("Falling back to manual DATABASE_URL entry...");

    // Fall back to manual entry
    const result = await p.text({
      message: "Enter your Neon DATABASE_URL:",
      placeholder: "postgresql://user:pass@host/db?sslmode=require",
      validate: (value) => {
        if (!value) return "DATABASE_URL is required";
        if (
          !value.startsWith("postgresql://") &&
          !value.startsWith("postgres://")
        ) {
          return "Must be a PostgreSQL connection string";
        }
        return undefined;
      },
    });

    if (p.isCancel(result)) {
      p.cancel("Setup cancelled.");
      process.exit(1);
    }

    return { databaseUrl: result };
  }
}

async function configureDatabaseUrl(
  mode: SetupMode
): Promise<{ databaseUrl: string; claimUrl?: string }> {
  if (mode === "local") {
    return {
      databaseUrl: "postgresql://postgres:postgres@localhost:5432/ainative_dev",
    };
  }

  if (mode === "instagres") {
    return provisionInstagresDatabase();
  }

  const result = await p.text({
    message: "Enter your Neon DATABASE_URL:",
    placeholder: "postgresql://user:pass@host/db?sslmode=require",
    validate: (value) => {
      if (!value) return "DATABASE_URL is required";
      if (
        !value.startsWith("postgresql://") &&
        !value.startsWith("postgres://")
      ) {
        return "Must be a PostgreSQL connection string";
      }
      return undefined;
    },
  });

  if (p.isCancel(result)) {
    p.cancel("Setup cancelled.");
    process.exit(1);
  }

  return { databaseUrl: result };
}

async function configureStripe(): Promise<{
  secretKey?: string;
  webhookSecret?: string;
  publishableKey?: string;
}> {
  const configure = await p.confirm({
    message: "Configure Stripe payments?",
    initialValue: true,
  });

  if (p.isCancel(configure) || !configure) {
    return {};
  }

  info(
    `Get your API keys from: ${link("https://dashboard.stripe.com/apikeys")}`
  );

  const secretKey = await p.text({
    message: "Stripe Secret Key:",
    placeholder: "sk_test_...",
    validate: (value) => {
      if (!value) return "Required for Stripe";
      if (!value.startsWith("sk_")) return "Must start with sk_";
      return undefined;
    },
  });

  if (p.isCancel(secretKey)) {
    return {};
  }

  const webhookSecret = await p.text({
    message: "Stripe Webhook Secret:",
    placeholder: "whsec_...",
    validate: (value) => {
      if (!value) return "Required for webhooks";
      if (!value.startsWith("whsec_")) return "Must start with whsec_";
      return undefined;
    },
  });

  if (p.isCancel(webhookSecret)) {
    return { secretKey };
  }

  const publishableKey = await p.text({
    message: "Stripe Publishable Key:",
    placeholder: "pk_test_...",
    validate: (value) => {
      if (!value) return "Required for client-side";
      if (!value.startsWith("pk_")) return "Must start with pk_";
      return undefined;
    },
  });

  if (p.isCancel(publishableKey)) {
    return { secretKey, webhookSecret };
  }

  return { secretKey, webhookSecret, publishableKey };
}

async function configureResend(mode: SetupMode): Promise<{
  apiKey?: string;
  fromEmail?: string;
  fromName?: string;
}> {
  if (mode === "local") {
    info("Using Mailpit for local email testing (http://localhost:8025)");
    return {
      fromEmail: "noreply@localhost",
      fromName: "AI Native (Local)",
    };
  }

  const configure = await p.confirm({
    message: "Configure Resend email?",
    initialValue: true,
  });

  if (p.isCancel(configure) || !configure) {
    return {};
  }

  info(`Get your API key from: ${link("https://resend.com/api-keys")}`);

  const apiKey = await p.text({
    message: "Resend API Key:",
    placeholder: "re_...",
    validate: (value) => {
      if (!value) return "Required for email";
      if (!value.startsWith("re_")) return "Must start with re_";
      return undefined;
    },
  });

  if (p.isCancel(apiKey)) {
    return {};
  }

  const fromEmail = await p.text({
    message: "From email address:",
    placeholder: "noreply@yourdomain.com",
    validate: (value) => {
      if (!value) return "Required";
      if (!value.includes("@")) return "Must be a valid email";
      return undefined;
    },
  });

  if (p.isCancel(fromEmail)) {
    return { apiKey };
  }

  const fromName = await p.text({
    message: "From name:",
    placeholder: "AI Native Boilerplate",
    initialValue: "AI Native Boilerplate",
  });

  if (p.isCancel(fromName)) {
    return { apiKey, fromEmail };
  }

  return { apiKey, fromEmail, fromName };
}

async function configureOptionalServices(): Promise<{
  posthogKey?: string;
  posthogHost?: string;
  sentryDsn?: string;
}> {
  const configureAnalytics = await p.confirm({
    message: "Configure PostHog analytics?",
    initialValue: false,
  });

  let posthogKey: string | undefined;
  let posthogHost: string | undefined;

  if (!p.isCancel(configureAnalytics) && configureAnalytics) {
    info(
      `Get your project key from: ${link("https://app.posthog.com/project/settings")}`
    );

    const key = await p.text({
      message: "PostHog Project Key:",
      placeholder: "phc_...",
    });

    if (!p.isCancel(key) && key) {
      posthogKey = key;
      posthogHost = "https://us.i.posthog.com";
    }
  }

  const configureSentry = await p.confirm({
    message: "Configure Sentry error tracking?",
    initialValue: false,
  });

  let sentryDsn: string | undefined;

  if (!p.isCancel(configureSentry) && configureSentry) {
    info(`Get your DSN from: ${link("https://sentry.io/settings/projects/")}`);

    const dsn = await p.text({
      message: "Sentry DSN:",
      placeholder: "https://...@sentry.io/...",
    });

    if (!p.isCancel(dsn) && dsn) {
      sentryDsn = dsn;
    }
  }

  return { posthogKey, posthogHost, sentryDsn };
}

function generateEnvFile(config: EnvConfig): string {
  const lines: string[] = [
    "# ===========================================",
    "# AI-Native Boilerplate Environment Variables",
    `# Generated by: bun setup`,
    `# Date: ${new Date().toISOString()}`,
    "# ===========================================",
    "",
    "# Core",
    `NEXT_PUBLIC_APP_URL=${config.NEXT_PUBLIC_APP_URL}`,
    "",
    "# Database",
    `DATABASE_URL=${config.DATABASE_URL}`,
  ];

  if (config.DATABASE_CLAIM_URL) {
    lines.push(
      `# Claim this database to keep it: ${config.DATABASE_CLAIM_URL}`
    );
    lines.push(`# Or run: npx get-db claim`);
  }

  lines.push(
    "",
    "# Authentication (auto-generated secret)",
    `BETTER_AUTH_SECRET=${config.BETTER_AUTH_SECRET}`,
    `BETTER_AUTH_URL=${config.BETTER_AUTH_URL}`,
    ""
  );

  // Stripe
  if (config.STRIPE_SECRET_KEY) {
    lines.push("# Payments (Stripe)");
    lines.push(`STRIPE_SECRET_KEY=${config.STRIPE_SECRET_KEY}`);
    if (config.STRIPE_WEBHOOK_SECRET) {
      lines.push(`STRIPE_WEBHOOK_SECRET=${config.STRIPE_WEBHOOK_SECRET}`);
    }
    if (config.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      lines.push(
        `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${config.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}`
      );
    }
    lines.push("");
  } else {
    lines.push("# Payments (Stripe) - Not configured");
    lines.push("# STRIPE_SECRET_KEY=sk_test_...");
    lines.push("# STRIPE_WEBHOOK_SECRET=whsec_...");
    lines.push("# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...");
    lines.push("");
  }

  // Email
  if (config.RESEND_API_KEY) {
    lines.push("# Email (Resend)");
    lines.push(`RESEND_API_KEY=${config.RESEND_API_KEY}`);
  } else if (!config.RESEND_API_KEY && config.FROM_EMAIL) {
    lines.push("# Email (Local - Mailpit)");
    lines.push("# RESEND_API_KEY not set - using Mailpit at localhost:8025");
  } else {
    lines.push("# Email (Resend) - Not configured");
    lines.push("# RESEND_API_KEY=re_...");
  }
  if (config.FROM_EMAIL) {
    lines.push(`FROM_EMAIL=${config.FROM_EMAIL}`);
  }
  if (config.FROM_NAME) {
    lines.push(`FROM_NAME=${config.FROM_NAME}`);
  }
  lines.push("");

  // Analytics
  if (config.NEXT_PUBLIC_POSTHOG_KEY) {
    lines.push("# Analytics (PostHog)");
    lines.push(`NEXT_PUBLIC_POSTHOG_KEY=${config.NEXT_PUBLIC_POSTHOG_KEY}`);
    lines.push(
      `NEXT_PUBLIC_POSTHOG_HOST=${config.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com"}`
    );
    lines.push("");
  }

  // Error tracking
  if (config.SENTRY_DSN) {
    lines.push("# Error Tracking (Sentry)");
    lines.push(`SENTRY_DSN=${config.SENTRY_DSN}`);
    lines.push("");
  }

  // Cron
  if (config.CRON_SECRET) {
    lines.push("# Cron Jobs");
    lines.push(`CRON_SECRET=${config.CRON_SECRET}`);
    lines.push("");
  }

  return lines.join("\n");
}

function showConfigSummary(config: EnvConfig): void {
  section("Configuration Summary");

  let dbStatus = "Neon";
  if (config.DATABASE_URL.includes("localhost")) {
    dbStatus = "Local (Docker)";
  } else if (config.DATABASE_CLAIM_URL) {
    dbStatus = colors.green("Instagres") + colors.dim(" (expires in 72h)");
  }

  const rows: [string, string][] = [
    ["App URL", config.NEXT_PUBLIC_APP_URL],
    ["Database", dbStatus],
    ["Auth Secret", mask(config.BETTER_AUTH_SECRET)],
    [
      "Stripe",
      config.STRIPE_SECRET_KEY
        ? colors.green("Configured")
        : colors.dim("Not configured"),
    ],
    [
      "Email",
      config.RESEND_API_KEY
        ? colors.green("Resend")
        : config.FROM_EMAIL
          ? colors.green("Mailpit (local)")
          : colors.dim("Not configured"),
    ],
    [
      "PostHog",
      config.NEXT_PUBLIC_POSTHOG_KEY
        ? colors.green("Configured")
        : colors.dim("Not configured"),
    ],
    [
      "Sentry",
      config.SENTRY_DSN
        ? colors.green("Configured")
        : colors.dim("Not configured"),
    ],
  ];

  table(rows);
}

async function startDockerServices(): Promise<boolean> {
  const { $ } = await import("bun");

  info("Starting Docker services...");

  try {
    await $`docker compose -f docker-compose.local.yml up -d`.quiet();
    success("Docker services started");

    // Wait for PostgreSQL to be ready
    info("Waiting for PostgreSQL to be ready...");
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      try {
        await $`docker exec ainative-postgres pg_isready -U postgres`.quiet();
        success("PostgreSQL is ready");
        return true;
      } catch {
        attempts++;
        await Bun.sleep(1000);
      }
    }

    error("PostgreSQL did not become ready in time");
    return false;
  } catch (e) {
    error(`Failed to start Docker services: ${e}`);
    return false;
  }
}

async function initializeDatabase(): Promise<boolean> {
  const { $ } = await import("bun");

  info("Initializing database schema...");

  try {
    await $`bun run db:push`.quiet();
    success("Database schema initialized");
    return true;
  } catch (e) {
    error(`Failed to initialize database: ${e}`);
    return false;
  }
}

async function main(): Promise<void> {
  const options = parseArgs();

  banner();

  p.intro(colors.cyan("Let's set up your development environment"));

  // Check for existing .env.local
  if (existsSync(ENV_FILE)) {
    const overwrite = await p.confirm({
      message: ".env.local already exists. Overwrite?",
      initialValue: false,
    });

    if (p.isCancel(overwrite) || !overwrite) {
      p.cancel("Setup cancelled. Existing configuration preserved.");
      process.exit(0);
    }
  }

  // Validate prerequisites
  const prereqResult = await validatePrerequisites({
    requireDocker: options.mode === "local" && !options.skipDocker,
  });

  printPrerequisitesResults(prereqResult);

  if (!prereqResult.passed) {
    error("Missing required prerequisites. Please install them and try again.");
    process.exit(1);
  }

  // Select mode if not specified via CLI
  let mode = options.mode;
  if (process.argv.length <= 2) {
    mode = await selectMode();
  }

  // Check Docker is running for local mode
  if (mode === "local" && !options.skipDocker) {
    const dockerRunning = await checkDockerRunning();
    if (!dockerRunning) {
      error(
        "Docker is not running. Please start Docker Desktop and try again."
      );
      process.exit(1);
    }
  }

  section("Configuration");

  // Build configuration
  const dbConfig = await configureDatabaseUrl(mode);
  const config: EnvConfig = {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    DATABASE_URL: dbConfig.databaseUrl,
    DATABASE_CLAIM_URL: dbConfig.claimUrl,
    BETTER_AUTH_SECRET: generateAuthSecret(),
    BETTER_AUTH_URL: "http://localhost:3000",
    CRON_SECRET: generateCronSecret(),
  };

  // Configure services
  if (mode !== "ci") {
    const stripe = await configureStripe();
    if (stripe.secretKey) {
      config.STRIPE_SECRET_KEY = stripe.secretKey;
      config.STRIPE_WEBHOOK_SECRET = stripe.webhookSecret;
      config.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = stripe.publishableKey;
    }

    const resend = await configureResend(mode);
    if (resend.apiKey) {
      config.RESEND_API_KEY = resend.apiKey;
    }
    if (resend.fromEmail) {
      config.FROM_EMAIL = resend.fromEmail;
    }
    if (resend.fromName) {
      config.FROM_NAME = resend.fromName;
    }

    const optional = await configureOptionalServices();
    if (optional.posthogKey) {
      config.NEXT_PUBLIC_POSTHOG_KEY = optional.posthogKey;
      config.NEXT_PUBLIC_POSTHOG_HOST = optional.posthogHost;
    }
    if (optional.sentryDsn) {
      config.SENTRY_DSN = optional.sentryDsn;
    }
  }

  // Show summary
  showConfigSummary(config);

  // Confirm and write
  const confirm = await p.confirm({
    message: "Write configuration to .env.local?",
    initialValue: true,
  });

  if (p.isCancel(confirm) || !confirm) {
    p.cancel("Setup cancelled.");
    process.exit(1);
  }

  // Write .env.local
  const envContent = generateEnvFile(config);
  writeFileSync(ENV_FILE, envContent);
  success("Created .env.local");

  // Start Docker services for local mode
  if (mode === "local" && !options.skipDocker) {
    section("Docker Services");
    const dockerStarted = await startDockerServices();
    if (!dockerStarted) {
      warning(
        "Docker services failed to start. You can start them manually with: bun docker:up"
      );
    }
  }

  // Initialize database
  section("Database");
  const dbInitialized = await initializeDatabase();
  if (!dbInitialized) {
    warning(
      "Database initialization failed. You can try manually with: bun db:push"
    );
  }

  // Final instructions
  section("Next Steps");

  console.log(`
${colors.green("Setup complete!")} Here's what to do next:

  ${colors.bold("1. Start development server:")}
     ${colors.cyan("bun dev")}

  ${colors.bold("2. Verify setup:")}
     ${colors.cyan("bun verify")}

  ${colors.bold("3. Run tests:")}
     ${colors.cyan("bun test")}
`);

  if (mode === "local") {
    console.log(`  ${colors.bold("Docker services:")}
     PostgreSQL: ${colors.cyan("localhost:5432")}
     Mailpit UI: ${colors.cyan("http://localhost:8025")}
     Mailpit SMTP: ${colors.cyan("localhost:1025")}
`);
  }

  if (mode === "instagres" && config.DATABASE_CLAIM_URL) {
    console.log(`  ${colors.bold(colors.yellow("Important: Database expires in 72 hours!"))}
     To keep your database permanently:
     ${colors.cyan("npx get-db claim")}
     Or visit: ${colors.cyan(config.DATABASE_CLAIM_URL)}
`);
  }

  if (!config.STRIPE_SECRET_KEY) {
    console.log(
      `  ${colors.dim("Note: Stripe is not configured. Payment features will be disabled.")}`
    );
  }

  if (!config.RESEND_API_KEY && mode !== "local") {
    console.log(
      `  ${colors.dim("Note: Resend is not configured. Email features will be disabled.")}`
    );
  }

  p.outro(colors.green("Happy coding!"));
}

main().catch((e) => {
  error(`Setup failed: ${e.message}`);
  process.exit(1);
});
