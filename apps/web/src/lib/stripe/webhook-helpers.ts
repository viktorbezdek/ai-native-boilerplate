import type Stripe from "stripe";

/**
 * Database subscription status type
 */
export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "trialing";

/**
 * Extract userId from checkout session
 * Checks metadata first, then falls back to client_reference_id
 */
export function getUserIdFromCheckoutSession(
  session: Stripe.Checkout.Session
): string | null {
  return session.metadata?.userId ?? session.client_reference_id ?? null;
}

/**
 * Extract userId from subscription metadata
 */
export function getUserIdFromSubscription(
  subscription: Stripe.Subscription
): string | null {
  return subscription.metadata?.userId ?? null;
}

/**
 * Extract subscription ID from a string or Stripe subscription object
 */
export function extractSubscriptionId(
  subscription: string | { id: string } | null | undefined
): string | null {
  if (!subscription) {
    return null;
  }
  if (typeof subscription === "string") {
    return subscription;
  }
  return subscription.id;
}

/**
 * Map Stripe subscription status to our database enum
 */
export function mapStripeStatus(
  status: Stripe.Subscription.Status
): SubscriptionStatus {
  switch (status) {
    case "active":
      return "active";
    case "canceled":
      return "canceled";
    case "past_due":
      return "past_due";
    case "trialing":
      return "trialing";
    case "incomplete":
    case "incomplete_expired":
    case "unpaid":
    case "paused":
      // These are valid Stripe statuses that we map to canceled for our purposes
      console.warn(
        `[Stripe] Mapping subscription status "${status}" to "canceled"`
      );
      return "canceled";
    default: {
      // Exhaustive check - this should never happen with typed Stripe statuses
      const _exhaustiveCheck: never = status;
      console.error(`[Stripe] Unknown subscription status: ${status}`);
      throw new Error(`Unknown subscription status: ${status}`);
    }
  }
}
