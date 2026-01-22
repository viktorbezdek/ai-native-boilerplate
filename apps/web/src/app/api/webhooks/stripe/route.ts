import { NextResponse } from "next/server";
import { constructWebhookEvent, handleWebhookEvent } from "@/lib/stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  try {
    const event = await constructWebhookEvent(body, signature);
    await handleWebhookEvent(event);

    return NextResponse.json({ received: true });
  } catch (error) {
    // Sanitize error logging - don't log full error objects which may contain sensitive data
    const errorMessage =
      error instanceof Error ? error.message : "Unknown webhook error";
    const sanitizedMessage = errorMessage
      .replace(/sk_[a-zA-Z0-9_]+/g, "[REDACTED_API_KEY]")
      .replace(/whsec_[a-zA-Z0-9_]+/g, "[REDACTED_WEBHOOK_SECRET]")
      .replace(/cus_[a-zA-Z0-9]+/g, "[CUSTOMER_ID]")
      .replace(/pi_[a-zA-Z0-9]+/g, "[PAYMENT_INTENT]")
      .replace(/sub_[a-zA-Z0-9]+/g, "[SUBSCRIPTION_ID]");
    console.error("Webhook error:", sanitizedMessage);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 400 }
    );
  }
}

// Stripe webhooks need the raw body, so disable body parsing
export const config = {
  api: {
    bodyParser: false,
  },
};
