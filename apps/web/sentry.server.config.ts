// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,

  // Only initialize Sentry if DSN is configured
  enabled: !!process.env.SENTRY_DSN,

  // Filter out development noise
  beforeSend(event) {
    // Don't send events in development
    if (process.env.NODE_ENV === "development") {
      return null;
    }
    return event;
  },

  // Ignore common errors that aren't actionable
  ignoreErrors: [
    // Network errors
    "ECONNRESET",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "fetch failed",
    // Common Next.js errors that are expected
    "NEXT_NOT_FOUND",
    "NEXT_REDIRECT",
  ],
});
