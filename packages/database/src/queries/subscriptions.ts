import { eq } from "drizzle-orm";
import { db } from "../index";
import {
  type NewSubscription,
  type Subscription,
  subscriptions,
} from "../schema";

/**
 * Get a subscription by user ID
 */
export async function getSubscriptionByUserId(
  userId: string
): Promise<Subscription | undefined> {
  const result = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });
  return result;
}

/**
 * Get a subscription by Stripe customer ID
 */
export async function getSubscriptionByStripeCustomerId(
  stripeCustomerId: string
): Promise<Subscription | undefined> {
  const result = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeCustomerId, stripeCustomerId),
  });
  return result;
}

/**
 * Get a subscription by Stripe subscription ID
 */
export async function getSubscriptionByStripeSubscriptionId(
  stripeSubscriptionId: string
): Promise<Subscription | undefined> {
  const result = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId),
  });
  return result;
}

/**
 * Create or update a subscription
 */
export async function upsertSubscription(
  data: NewSubscription
): Promise<Subscription> {
  const existing = await getSubscriptionByUserId(data.userId);

  if (existing) {
    const [subscription] = await db
      .update(subscriptions)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, data.userId))
      .returning();

    if (!subscription) {
      throw new Error("Failed to update subscription");
    }

    return subscription;
  }

  const [subscription] = await db
    .insert(subscriptions)
    .values(data)
    .returning();

  if (!subscription) {
    throw new Error("Failed to create subscription");
  }

  return subscription;
}

/**
 * Update subscription status
 */
export async function updateSubscriptionStatus(
  stripeSubscriptionId: string,
  status: Subscription["status"],
  cancelAtPeriodEnd = false
): Promise<Subscription> {
  const [subscription] = await db
    .update(subscriptions)
    .set({
      status,
      cancelAtPeriodEnd,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .returning();

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  return subscription;
}

/**
 * Update subscription period
 */
export async function updateSubscriptionPeriod(
  stripeSubscriptionId: string,
  currentPeriodStart: Date,
  currentPeriodEnd: Date
): Promise<Subscription> {
  const [subscription] = await db
    .update(subscriptions)
    .set({
      currentPeriodStart,
      currentPeriodEnd,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .returning();

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  return subscription;
}

/**
 * Delete a subscription
 */
export async function deleteSubscription(userId: string): Promise<void> {
  await db.delete(subscriptions).where(eq(subscriptions.userId, userId));
}
