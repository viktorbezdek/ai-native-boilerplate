"use client";

import posthog from "posthog-js";
import {
  useFeatureFlagEnabled,
  useFeatureFlagVariantKey,
} from "posthog-js/react";

// Type-safe feature flag names
export const FEATURE_FLAGS = {
  NEW_DASHBOARD: "new-dashboard",
  DARK_MODE: "dark-mode",
  AI_ASSISTANT: "ai-assistant",
  TEAM_FEATURES: "team-features",
  ADVANCED_ANALYTICS: "advanced-analytics",
  BETA_FEATURES: "beta-features",
} as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

/**
 * Check if a feature flag is enabled (non-hook version)
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return posthog.isFeatureEnabled(flag) ?? false;
}

/**
 * Get feature flag variant key (non-hook version)
 */
export function getFeatureFlagVariant(flag: FeatureFlag): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const variant = posthog.getFeatureFlag(flag);
  return typeof variant === "string" ? variant : undefined;
}

/**
 * React hook for feature flag enabled state
 */
export function useFeatureFlag(flag: FeatureFlag): boolean {
  return useFeatureFlagEnabled(flag) ?? false;
}

/**
 * React hook for feature flag variant
 */
export function useFeatureFlagVariant(flag: FeatureFlag): string | undefined {
  const variant = useFeatureFlagVariantKey(flag);
  if (typeof variant === "string") {
    return variant;
  }
  return undefined;
}

/**
 * Override feature flags for testing
 */
export function overrideFeatureFlags(
  flags: Partial<Record<FeatureFlag, boolean>>
) {
  if (typeof window === "undefined") {
    return;
  }

  for (const [flag, enabled] of Object.entries(flags)) {
    posthog.featureFlags.override({ [flag]: enabled });
  }
}

/**
 * Clear feature flag overrides
 */
export function clearFeatureFlagOverrides() {
  if (typeof window === "undefined") {
    return;
  }

  posthog.featureFlags.override(false);
}
