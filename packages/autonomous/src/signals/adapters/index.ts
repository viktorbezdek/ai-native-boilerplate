/**
 * Signal adapter exports
 */

export { LocalAdapter, createLocalAdapter } from "./local-adapter";
export type { LocalAdapterConfig } from "./local-adapter";

export { SentryAdapter, createSentryAdapter } from "./sentry-adapter";
export type { SentryAdapterConfig } from "./sentry-adapter";

export { PostHogAdapter, createPostHogAdapter } from "./posthog-adapter";
export type { PostHogAdapterConfig } from "./posthog-adapter";

export { VercelAdapter, createVercelAdapter } from "./vercel-adapter";
export type { VercelAdapterConfig } from "./vercel-adapter";
