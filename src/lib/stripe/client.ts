import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
});

// Price IDs from Stripe Dashboard
export const PRICE_IDS = {
  // Example price IDs - replace with actual Stripe price IDs
  PRO_MONTHLY: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? "price_pro_monthly",
  PRO_YEARLY: process.env.STRIPE_PRO_YEARLY_PRICE_ID ?? "price_pro_yearly",
  TEAM_MONTHLY: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID ?? "price_team_monthly",
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
