import { type PriceId, stripe } from "./client";

interface CreateCheckoutSessionOptions {
  priceId: PriceId;
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
  trialDays?: number;
}

/**
 * Create a Stripe Checkout session for subscription
 */
export async function createCheckoutSession({
  priceId,
  userId,
  userEmail,
  successUrl,
  cancelUrl,
  trialDays,
}: CreateCheckoutSessionOptions) {
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: userEmail,
    client_reference_id: userId,
    metadata: {
      userId,
    },
    subscription_data: {
      metadata: {
        userId,
      },
      ...(trialDays && { trial_period_days: trialDays }),
    },
    allow_promotion_codes: true,
  });

  return session;
}

/**
 * Create a Stripe Checkout session for one-time payment
 */
export async function createOneTimeCheckoutSession({
  priceId,
  userId,
  userEmail,
  successUrl,
  cancelUrl,
}: Omit<CreateCheckoutSessionOptions, "trialDays">) {
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: userEmail,
    client_reference_id: userId,
    metadata: {
      userId,
    },
    allow_promotion_codes: true,
  });

  return session;
}
