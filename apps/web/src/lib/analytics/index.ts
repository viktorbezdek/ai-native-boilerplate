// Client-side exports
export { PostHogProvider, posthog } from "./provider";

export {
  ANALYTICS_EVENTS,
  trackEvent,
  trackPageView,
  identifyUser,
  resetUser,
  setUserProperties,
  trackTiming,
} from "./events";
export type { AnalyticsEvent } from "./events";

export {
  FEATURE_FLAGS,
  isFeatureEnabled,
  getFeatureFlagVariant,
  useFeatureFlag,
  useFeatureFlagVariant,
  overrideFeatureFlags,
  clearFeatureFlagOverrides,
} from "./feature-flags";
export type { FeatureFlag } from "./feature-flags";

// Server-side exports (import separately to avoid client bundle)
// import { trackServerEvent } from "@/lib/analytics/server"
