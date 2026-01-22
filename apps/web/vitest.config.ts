import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
  // Load env files from apps/web directory
  const env = loadEnv(mode, resolve(__dirname), "");

  return {
    plugins: [react()],
    // Make env vars available to tests
    define: {
      "process.env.STRIPE_SECRET_KEY": JSON.stringify(env.STRIPE_SECRET_KEY),
      "process.env.STRIPE_WEBHOOK_SECRET": JSON.stringify(
        env.STRIPE_WEBHOOK_SECRET
      ),
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./tests/setup.ts"],
      include: [
        "tests/unit/**/*.{test,spec}.{ts,tsx}",
        "tests/integration/**/*.{test,spec}.{ts,tsx}",
      ],
      exclude: [
        "node_modules",
        ".next",
        "**/e2e/**",
        "playwright-report/**",
        "tests/unit/components/**", // Run with vitest browser instead
      ],
      coverage: {
        provider: "v8",
        reporter: ["text", "json", "html", "lcov"],
        exclude: [
          "node_modules",
          ".next",
          "tests",
          "**/*.d.ts",
          "**/*.config.*",
          "**/types/**",
          "drizzle/**",
        ],
        thresholds: {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
      },
      testTimeout: 10000,
      hookTimeout: 10000,
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
        "@repo/utils": resolve(__dirname, "../../packages/utils/src"),
        "@repo/validations": resolve(
          __dirname,
          "../../packages/validations/src"
        ),
        "@repo/database": resolve(__dirname, "../../packages/database/src"),
        "@repo/ui": resolve(__dirname, "../../packages/ui/src"),
        "@repo/payments": resolve(__dirname, "../../packages/payments/src"),
        "@repo/email": resolve(__dirname, "../../packages/email/src"),
      },
    },
  };
});
