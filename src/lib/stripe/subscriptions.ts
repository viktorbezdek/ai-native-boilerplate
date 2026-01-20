import { stripe, type PriceId } from "./client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Get a customer's subscription
 */
export async function getSubscription(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["default_payment_method", "items.data.price.product"],
  });
}

/**
 * Cancel a subscription at period end
 */
export async function cancelSubscription(subscriptionId: string) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Reactivate a canceled subscription
 */
export async function reactivateSubscription(subscriptionId: string) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

/**
 * Update subscription to a new price
 */
export async function updateSubscriptionPrice(
  subscriptionId: string,
  newPriceId: PriceId
) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const subscriptionItemId = subscription.items.data[0]?.id;

  if (!subscriptionItemId) {
    throw new Error("No subscription item found");
  }

  return stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscriptionItemId,
        price: newPriceId,
      },
    ],
    proration_behavior: "create_prorations",
  });
}

/**
 * Create or get a Stripe customer
 */
export async function getOrCreateCustomer(email: string, userId: string) {
  // Search for existing customer
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Create new customer
  return stripe.customers.create({
    email,
    metadata: {
      userId,
    },
  });
}

/**
 * Create a billing portal session
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl = `${APP_URL}/dashboard/settings`
) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

/**
 * Get customer's invoices
 */
export async function getCustomerInvoices(customerId: string, limit = 10) {
  return stripe.invoices.list({
    customer: customerId,
    limit,
  });
}

/**
 * Get upcoming invoice for a subscription
 */
export async function getUpcomingInvoice(customerId: string) {
  try {
    return await stripe.invoices.retrieveUpcoming({
      customer: customerId,
    });
  } catch (error) {
    // No upcoming invoice (no active subscription)
    return null;
  }
}
