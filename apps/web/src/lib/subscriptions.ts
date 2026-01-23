import { getSubscriptionByUserId } from "@repo/database/queries";

/**
 * Check if a user has an active subscription
 * Active means: status is "active" or "trialing" and not past the current period end
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  try {
    const subscription = await getSubscriptionByUserId(userId);

    if (!subscription) {
      return false;
    }

    // Check if subscription is in an active state
    const activeStatuses = ["active", "trialing"];
    if (!activeStatuses.includes(subscription.status)) {
      return false;
    }

    // Check if we're still within the subscription period
    if (subscription.currentPeriodEnd) {
      const now = new Date();
      if (now > subscription.currentPeriodEnd) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Error checking subscription status:", error);
    return false;
  }
}

/**
 * Get detailed subscription info for a user
 */
export async function getSubscriptionInfo(userId: string): Promise<{
  hasSubscription: boolean;
  isActive: boolean;
  status: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
} | null> {
  try {
    const subscription = await getSubscriptionByUserId(userId);

    if (!subscription) {
      return {
        hasSubscription: false,
        isActive: false,
        status: null,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      };
    }

    const activeStatuses = ["active", "trialing"];
    const isActive =
      activeStatuses.includes(subscription.status) &&
      (!subscription.currentPeriodEnd ||
        new Date() <= subscription.currentPeriodEnd);

    return {
      hasSubscription: true,
      isActive,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      currentPeriodEnd: subscription.currentPeriodEnd,
    };
  } catch (error) {
    console.error("Error getting subscription info:", error);
    return null;
  }
}
