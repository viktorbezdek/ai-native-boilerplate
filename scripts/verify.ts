#!/usr/bin/env bun
/**
 * AI-Native Boilerplate Verification Script
 *
 * Comprehensive health check after setup completes.
 *
 * Usage:
 *   bun verify
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { $ } from "bun";
import { validateAuthSecret } from "./lib/secrets";
import { checkAllServices } from "./lib/services";
import {
  type CheckResult,
  checkResults,
  colors,
  error,
  summary,
} from "./lib/ui";

const ROOT_DIR = resolve(import.meta.dir, "..");
const ENV_FILE = resolve(ROOT_DIR, ".env.local");

interface EnvVars {
  [key: string]: string | undefined;
}

function loadEnvFile(): EnvVars {
  if (!existsSync(ENV_FILE)) {
    return {};
  }

  const content = readFileSync(ENV_FILE, "utf-8");
  const vars: EnvVars = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      vars[key.trim()] = value.trim();
    }
  }

  return vars;
}

async function checkEnvironment(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  // Check .env.local exists
  if (existsSync(ENV_FILE)) {
    results.push({ name: ".env.local exists", status: "pass" });
  } else {
    results.push({
      name: ".env.local exists",
      status: "fail",
      message: "Run: bun setup",
    });
    return results;
  }

  const env = loadEnvFile();

  // Check required variables
  const requiredVars = [
    "NEXT_PUBLIC_APP_URL",
    "DATABASE_URL",
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
  ];

  const missingVars = requiredVars.filter((v) => !env[v]);
  if (missingVars.length === 0) {
    results.push({
      name: "Required variables set",
      status: "pass",
      message: `${requiredVars.length}/${requiredVars.length}`,
    });
  } else {
    results.push({
      name: "Required variables set",
      status: "fail",
      message: `Missing: ${missingVars.join(", ")}`,
    });
  }

  // Check auth secret is secure
  const authSecret = env.BETTER_AUTH_SECRET || "";
  const authValidation = validateAuthSecret(authSecret);
  if (authValidation.valid) {
    results.push({ name: "Auth secret is secure", status: "pass" });
  } else {
    results.push({
      name: "Auth secret is secure",
      status: "fail",
      message: authValidation.error,
    });
  }

  return results;
}

async function checkBuild(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  // Check node_modules exists
  if (existsSync(resolve(ROOT_DIR, "node_modules"))) {
    results.push({ name: "Dependencies installed", status: "pass" });
  } else {
    results.push({
      name: "Dependencies installed",
      status: "fail",
      message: "Run: bun install",
    });
    return results;
  }

  // Check TypeScript compiles
  try {
    await $`bun run typecheck`.quiet();
    results.push({ name: "TypeScript compiles", status: "pass" });
  } catch {
    results.push({
      name: "TypeScript compiles",
      status: "fail",
      message: "Run: bun typecheck",
    });
  }

  // Check lint passes
  try {
    await $`bun run lint`.quiet();
    results.push({ name: "Lint passes", status: "pass" });
  } catch {
    results.push({
      name: "Lint passes",
      status: "fail",
      message: "Run: bun lint:fix",
    });
  }

  return results;
}

async function checkDocker(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  // Check if using local database
  const env = loadEnvFile();
  const isLocalDb = env.DATABASE_URL?.includes("localhost");

  if (!isLocalDb) {
    results.push({
      name: "Docker services",
      status: "skip",
      message: "using external database",
    });
    return results;
  }

  // Check Docker is running
  try {
    await $`docker info`.quiet();
  } catch {
    results.push({
      name: "Docker running",
      status: "fail",
      message: "Start Docker Desktop",
    });
    return results;
  }

  results.push({ name: "Docker running", status: "pass" });

  // Check containers are running
  try {
    const pgResult =
      await $`docker inspect -f '{{.State.Running}}' ainative-postgres`.quiet();
    if (pgResult.stdout.toString().trim() === "true") {
      results.push({ name: "PostgreSQL container", status: "pass" });
    } else {
      results.push({
        name: "PostgreSQL container",
        status: "fail",
        message: "Run: bun docker:up",
      });
    }
  } catch {
    results.push({
      name: "PostgreSQL container",
      status: "fail",
      message: "Run: bun docker:up",
    });
  }

  try {
    const mailpitResult =
      await $`docker inspect -f '{{.State.Running}}' ainative-mailpit`.quiet();
    if (mailpitResult.stdout.toString().trim() === "true") {
      results.push({ name: "Mailpit container", status: "pass" });
    } else {
      results.push({
        name: "Mailpit container",
        status: "skip",
        message: "optional",
      });
    }
  } catch {
    results.push({
      name: "Mailpit container",
      status: "skip",
      message: "optional",
    });
  }

  return results;
}

async function main(): Promise<void> {
  console.log();
  console.log(
    colors.cyan(`
  ╭─────────────────────────────────────────╮
  │                                         │
  │     ${colors.bold("AI-Native Setup Verification")}        │
  │                                         │
  ╰─────────────────────────────────────────╯
`)
  );

  const env = loadEnvFile();

  // Environment checks
  const envResults = await checkEnvironment();
  checkResults("Environment", envResults);

  // Service checks
  if (existsSync(ENV_FILE)) {
    const serviceResults = await checkAllServices(env);
    checkResults("Services", serviceResults);
  }

  // Docker checks (if using local database)
  const dockerResults = await checkDocker();
  if (dockerResults.length > 0) {
    checkResults("Docker", dockerResults);
  }

  // Build checks
  const buildResults = await checkBuild();
  checkResults("Build", buildResults);

  // Calculate totals
  const allResults = [
    ...envResults,
    ...(existsSync(ENV_FILE) ? await checkAllServices(env) : []),
    ...dockerResults,
    ...buildResults,
  ];
  const passed = allResults.filter((r) => r.status === "pass").length;
  const failed = allResults.filter((r) => r.status === "fail").length;
  const skipped = allResults.filter((r) => r.status === "skip").length;

  summary(passed, failed, skipped);

  if (failed === 0) {
    console.log();
    console.log(
      `${colors.green("Ready to start!")} Run: ${colors.cyan("bun dev")}`
    );
    console.log();
    process.exit(0);
  } else {
    console.log();
    console.log(
      colors.yellow("Some checks failed.") +
        " Fix the issues above and run " +
        colors.cyan("bun verify") +
        " again."
    );
    console.log();
    process.exit(1);
  }
}

main().catch((e) => {
  error(`Verification failed: ${e.message}`);
  process.exit(1);
});
