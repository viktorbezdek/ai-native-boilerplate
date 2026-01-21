import { identifyServerUser, trackServerEvent } from "@/lib/analytics/server";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { stripe } from "./client";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
  console.warn("STRIPE_WEBHOOK_SECRET is not set - webhooks will fail");
}

/**
 * Verify and construct Stripe webhook event
 */
export async function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Promise<Stripe.Event> {
  if (!WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }

  return stripe.webhooks.constructEvent(payload, signature, WEBHOOK_SECRET);
}

/**
 * Handle Stripe webhook events
 */
export async function handleWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object);
      break;

    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionChange(event.data.object);
      break;

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object);
      break;

    case "invoice.payment_succeeded":
      await handlePaymentSucceeded(event.data.object);
      break;

    case "invoice.payment_failed":
      await handlePaymentFailed(event.data.object);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId ?? session.client_reference_id;

  if (!userId) {
    console.error("No userId in checkout session");
    return;
  }

  // Track checkout completion
  trackServerEvent(userId, "checkout_completed", {
    session_id: session.id,
    mode: session.mode,
    amount_total: session.amount_total,
    currency: session.currency,
  });

  if (session.mode === "subscription" && session.subscription) {
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Track subscription created
    const priceId = subscription.items.data[0]?.price.id;
    trackServerEvent(userId, "subscription_created", {
      subscription_id: subscription.id,
      price_id: priceId,
      status: subscription.status,
      interval: subscription.items.data[0]?.price.recurring?.interval,
    });

    // Update user properties for segmentation
    identifyServerUser(userId, {
      subscription_status: subscription.status,
      subscription_price_id: priceId,
      is_subscriber: true,
    });

    await upsertSubscription(userId, subscription);
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error("No userId in subscription metadata");
    return;
  }

  // Track subscription update
  const priceId = subscription.items.data[0]?.price.id;
  trackServerEvent(userId, "subscription_updated", {
    subscription_id: subscription.id,
    price_id: priceId,
    status: subscription.status,
    cancel_at_period_end: subscription.cancel_at_period_end,
  });

  // Update user properties
  identifyServerUser(userId, {
    subscription_status: subscription.status,
    subscription_price_id: priceId,
  });

  await upsertSubscription(userId, subscription);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error("No userId in subscription metadata");
    return;
  }

  // Track subscription cancellation
  trackServerEvent(userId, "subscription_canceled", {
    subscription_id: subscription.id,
    price_id: subscription.items.data[0]?.price.id,
    canceled_at: subscription.canceled_at,
  });

  // Update user properties
  identifyServerUser(userId, {
    subscription_status: "canceled",
    is_subscriber: false,
  });

  await db
    .update(subscriptions)
    .set({
      status: "canceled",
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const _customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;

  // Try to get userId from subscription metadata
  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;

  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata?.userId;

    if (userId) {
      trackServerEvent(userId, "payment_succeeded", {
        invoice_id: invoice.id,
        amount_paid: invoice.amount_paid,
        currency: invoice.currency,
      });
    }
  }

  console.log(`Payment succeeded for invoice ${invoice.id}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;

  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata?.userId;

    if (userId) {
      trackServerEvent(userId, "payment_failed", {
        invoice_id: invoice.id,
        amount_due: invoice.amount_due,
        currency: invoice.currency,
        attempt_count: invoice.attempt_count,
      });
    }
  }

  console.log(`Payment failed for invoice ${invoice.id}`);
}

async function upsertSubscription(
  userId: string,
  subscription: Stripe.Subscription
) {
  const priceId = subscription.items.data[0]?.price.id;
  const productId =
    typeof subscription.items.data[0]?.price.product === "string"
      ? subscription.items.data[0]?.price.product
      : subscription.items.data[0]?.price.product?.id;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  // Map Stripe status to our database enum
  const mapStatus = (
    status: Stripe.Subscription.Status
  ): "active" | "canceled" | "past_due" | "trialing" => {
    switch (status) {
      case "active":
        return "active";
      case "canceled":
        return "canceled";
      case "past_due":
        return "past_due";
      case "trialing":
        return "trialing";
      default:
        return "canceled";
    }
  };

  const subscriptionData = {
    userId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    stripeProductId: productId,
    status: mapStatus(subscription.status),
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    canceledAt: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000)
      : null,
    trialStart: subscription.trial_start
      ? new Date(subscription.trial_start * 1000)
      : null,
    trialEnd: subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : null,
    updatedAt: new Date(),
  };

  // Check if subscription exists
  const existing = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(subscriptions)
      .set(subscriptionData)
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
  } else {
    await db.insert(subscriptions).values({
      ...subscriptionData,
      createdAt: new Date(),
    });
  }
}
