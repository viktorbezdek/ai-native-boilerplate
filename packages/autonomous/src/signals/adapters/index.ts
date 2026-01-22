/**
 * Signal adapter exports
 */

export type { LocalAdapterConfig } from "./local-adapter";
export { createLocalAdapter, LocalAdapter } from "./local-adapter";
export type { PostHogAdapterConfig } from "./posthog-adapter";
export { createPostHogAdapter, PostHogAdapter } from "./posthog-adapter";
export type { SentryAdapterConfig } from "./sentry-adapter";
export { createSentryAdapter, SentryAdapter } from "./sentry-adapter";
export type { VercelAdapterConfig } from "./vercel-adapter";
export { createVercelAdapter, VercelAdapter } from "./vercel-adapter";
