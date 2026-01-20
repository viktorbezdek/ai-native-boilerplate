import { PostHog } from "posthog-node";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

let posthogClient: PostHog | null = null;

/**
 * Get server-side PostHog client
 */
export function getPostHogClient(): PostHog | null {
  if (!POSTHOG_KEY) {
    return null;
  }

  if (!posthogClient) {
    posthogClient = new PostHog(POSTHOG_KEY, {
      host: POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
    });
  }

  return posthogClient;
}

/**
 * Track server-side event
 */
export function trackServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
) {
  const client = getPostHogClient();
  if (!client) return;

  client.capture({
    distinctId,
    event,
    properties,
  });
}

/**
 * Identify user server-side
 */
export function identifyServerUser(
  distinctId: string,
  properties?: Record<string, unknown>
) {
  const client = getPostHogClient();
  if (!client) return;

  client.identify({
    distinctId,
    properties,
  });
}

/**
 * Check feature flag server-side
 */
export async function isFeatureEnabledServer(
  flag: string,
  distinctId: string
): Promise<boolean> {
  const client = getPostHogClient();
  if (!client) return false;

  return client.isFeatureEnabled(flag, distinctId) ?? false;
}

/**
 * Get all feature flags for user server-side
 */
export async function getAllFeatureFlagsServer(
  distinctId: string
): Promise<Record<string, boolean | string>> {
  const client = getPostHogClient();
  if (!client) return {};

  return client.getAllFlags(distinctId);
}

/**
 * Shutdown PostHog client (call on server shutdown)
 */
export async function shutdownPostHog() {
  if (posthogClient) {
    await posthogClient.shutdown();
    posthogClient = null;
  }
}
