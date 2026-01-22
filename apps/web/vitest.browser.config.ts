import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    browser: {
      enabled: true,
      name: "chromium",
      provider: "playwright",
      headless: true,
    },
    globals: true,
    include: ["tests/unit/components/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "**/e2e/**", "playwright-report/**"],
    testTimeout: 15000,
    hookTimeout: 15000,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@repo/utils": resolve(__dirname, "../../packages/utils/src"),
      "@repo/validations": resolve(__dirname, "../../packages/validations/src"),
      "@repo/database": resolve(__dirname, "../../packages/database/src"),
      "@repo/ui": resolve(__dirname, "../../packages/ui/src"),
      "@repo/payments": resolve(__dirname, "../../packages/payments/src"),
      "@repo/email": resolve(__dirname, "../../packages/email/src"),
    },
  },
});
