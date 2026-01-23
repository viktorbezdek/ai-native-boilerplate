// Preload script - runs before any test files are loaded
// This ensures env vars are set before modules are imported
// Loaded via bunfig.toml [test] preload

process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || "re_test_123456789";
process.env.FROM_EMAIL = process.env.FROM_EMAIL || "test@example.com";
process.env.BETTER_AUTH_SECRET =
  process.env.BETTER_AUTH_SECRET || "test-secret-key-min-32-characters-here";
process.env.BETTER_AUTH_URL =
  process.env.BETTER_AUTH_URL || "http://localhost:3000";
process.env.NEXT_PUBLIC_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export {};
