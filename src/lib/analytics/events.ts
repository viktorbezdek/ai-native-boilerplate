"use client";

import posthog from "posthog-js";

// Type-safe event names
export const ANALYTICS_EVENTS = {
  // Auth events
  USER_SIGNED_UP: "user_signed_up",
  USER_SIGNED_IN: "user_signed_in",
  USER_SIGNED_OUT: "user_signed_out",
  PASSWORD_RESET_REQUESTED: "password_reset_requested",

  // Project events
  PROJECT_CREATED: "project_created",
  PROJECT_UPDATED: "project_updated",
  PROJECT_DELETED: "project_deleted",
  PROJECT_VIEWED: "project_viewed",

  // Subscription events
  CHECKOUT_STARTED: "checkout_started",
  CHECKOUT_COMPLETED: "checkout_completed",
  SUBSCRIPTION_UPGRADED: "subscription_upgraded",
  SUBSCRIPTION_DOWNGRADED: "subscription_downgraded",
  SUBSCRIPTION_CANCELED: "subscription_canceled",

  // Page views
  PAGE_VIEW: "$pageview",

  // Engagement
  FEATURE_USED: "feature_used",
  SEARCH_PERFORMED: "search_performed",
  FEEDBACK_SUBMITTED: "feedback_submitted",
} as const;

export type AnalyticsEvent =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/**
 * Track a custom event
 */
export function trackEvent(
  event: AnalyticsEvent,
  properties?: Record<string, unknown>
) {
  if (typeof window === "undefined") return;

  posthog.capture(event, properties);
}

/**
 * Track a page view
 */
export function trackPageView(path: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  posthog.capture(ANALYTICS_EVENTS.PAGE_VIEW, {
    $current_url: window.location.href,
    path,
    ...properties,
  });
}

/**
 * Identify a user
 */
export function identifyUser(
  userId: string,
  properties?: Record<string, unknown>
) {
  if (typeof window === "undefined") return;

  posthog.identify(userId, properties);
}

/**
 * Reset user identity (on logout)
 */
export function resetUser() {
  if (typeof window === "undefined") return;

  posthog.reset();
}

/**
 * Set user properties without identifying
 */
export function setUserProperties(properties: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  posthog.setPersonProperties(properties);
}

/**
 * Track timing/duration
 */
export function trackTiming(name: string, durationMs: number) {
  if (typeof window === "undefined") return;

  posthog.capture("timing", {
    name,
    duration_ms: durationMs,
  });
}
