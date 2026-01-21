import Stripe from "stripe";

// Lazy initialization to avoid breaking during build
let stripeInstance: Stripe | null = null;

function getStripeInstance(): Stripe {
  if (stripeInstance) {
    return stripeInstance;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }

  stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-02-24.acacia",
    typescript: true,
  });

  return stripeInstance;
}

// Export as getter to lazy-initialize
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    const instance = getStripeInstance();
    const value = instance[prop as keyof Stripe];
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});

// Price IDs from Stripe Dashboard
export const PRICE_IDS = {
  // Example price IDs - replace with actual Stripe price IDs
  PRO_MONTHLY: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? "price_pro_monthly",
  PRO_YEARLY: process.env.STRIPE_PRO_YEARLY_PRICE_ID ?? "price_pro_yearly",
  TEAM_MONTHLY:
    process.env.STRIPE_TEAM_MONTHLY_PRICE_ID ?? "price_team_monthly",
  TEAM_YEARLY: process.env.STRIPE_TEAM_YEARLY_PRICE_ID ?? "price_team_yearly",
} as const;

export type PriceId = (typeof PRICE_IDS)[keyof typeof PRICE_IDS];

// Subscription status types
export const SUBSCRIPTION_STATUS = {
  ACTIVE: "active",
  CANCELED: "canceled",
  INCOMPLETE: "incomplete",
  INCOMPLETE_EXPIRED: "incomplete_expired",
  PAST_DUE: "past_due",
  PAUSED: "paused",
  TRIALING: "trialing",
  UNPAID: "unpaid",
} as const;

export type SubscriptionStatus =
  (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];
