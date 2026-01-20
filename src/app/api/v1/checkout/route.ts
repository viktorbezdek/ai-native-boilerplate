import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createCheckoutSession, PRICE_IDS } from "@/lib/stripe";
import { trackServerEvent } from "@/lib/analytics/server";

const checkoutSchema = z.object({
  priceId: z.string().min(1, "Price ID is required"),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();

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

    const { priceId, successUrl, cancelUrl } = validation.data;

    // Validate price ID is one of our known prices
    const validPriceIds = Object.values(PRICE_IDS);
    if (!validPriceIds.includes(priceId as typeof validPriceIds[number])) {
      return NextResponse.json({ error: "Invalid price ID" }, { status: 400 });
    }

    // Track checkout initiation
    trackServerEvent(session.user.id, "checkout_started", {
      price_id: priceId,
    });

    const checkoutSession = await createCheckoutSession({
      priceId: priceId as typeof validPriceIds[number],
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
