import { trackServerEvent } from "@/lib/analytics/server";
import { applyApiMiddleware } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { PRICE_IDS, createCheckoutSession } from "@repo/payments";
import { NextResponse } from "next/server";
import { z } from "zod";

const checkoutSchema = z.object({
  priceId: z.string().min(1, "Price ID is required"),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export async function POST(request: Request) {
  // Apply rate limiting and CSRF protection for checkout
  const middleware = await applyApiMiddleware(request, {
    rateLimit: "strict", // Stricter rate limit for checkout
    csrf: true,
    routePrefix: "checkout",
  });
  if (!middleware.success && middleware.error) {
    return middleware.error;
  }

  try {
    const session = await getSession();

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = checkoutSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { priceId } = validation.data;
    const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
    const successUrl =
      validation.data.successUrl ?? `${baseUrl}/dashboard?checkout=success`;
    const cancelUrl =
      validation.data.cancelUrl ?? `${baseUrl}/pricing?checkout=cancelled`;

    // Validate price ID is one of our known prices
    const validPriceIds = Object.values(PRICE_IDS);
    if (!validPriceIds.includes(priceId as (typeof validPriceIds)[number])) {
      return NextResponse.json({ error: "Invalid price ID" }, { status: 400 });
    }

    // Track checkout initiation
    trackServerEvent(session.user.id, "checkout_started", {
      price_id: priceId,
    });

    const checkoutSession = await createCheckoutSession({
      priceId: priceId as (typeof validPriceIds)[number],
      userId: session.user.id,
      userEmail: session.user.email,
      successUrl,
      cancelUrl,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
