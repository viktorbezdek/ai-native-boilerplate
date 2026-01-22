// Client-side exports

export type { AnalyticsEvent } from "./events";

export {
  ANALYTICS_EVENTS,
  identifyUser,
  resetUser,
  setUserProperties,
  trackEvent,
  trackPageView,
  trackTiming,
} from "./events";
export type { FeatureFlag } from "./feature-flags";

export {
  clearFeatureFlagOverrides,
  FEATURE_FLAGS,
  getFeatureFlagVariant,
  isFeatureEnabled,
  overrideFeatureFlags,
  useFeatureFlag,
  useFeatureFlagVariant,
} from "./feature-flags";
export { PostHogProvider, posthog } from "./provider";

// Server-side exports (import separately to avoid client bundle)
// import { trackServerEvent } from "@/lib/analytics/server"
