import { applyApiMiddleware } from "@/lib/api";
import { auth } from "@/lib/auth";
import { getSubscriptionByUserId } from "@/lib/db/queries";
import { createBillingPortalSession } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // Apply rate limiting and CSRF protection for billing
  const middleware = await applyApiMiddleware(request, {
    rateLimit: "strict", // Stricter rate limit for billing
    csrf: true,
    routePrefix: "billing",
  });
  if (!middleware.success && middleware.error) {
    return middleware.error;
  }

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's subscription to find their Stripe customer ID
    const subscription = await getSubscriptionByUserId(session.user.id);

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 }
      );
    }

    const portalSession = await createBillingPortalSession(
      subscription.stripeCustomerId
    );

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("Billing portal error:", error);
    return NextResponse.json(
      { error: "Failed to create billing portal session" },
      { status: 500 }
    );
  }
}
