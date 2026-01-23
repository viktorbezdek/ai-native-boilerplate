import type Stripe from "stripe";
import { describe, expect, it } from "vitest";

// These helper functions will be extracted from webhooks.ts
import {
  extractSubscriptionId,
  getUserIdFromCheckoutSession,
  getUserIdFromSubscription,
  mapStripeStatus,
} from "@/lib/stripe/webhook-helpers";

describe("webhook-helpers", () => {
  describe("getUserIdFromCheckoutSession", () => {
    it("should return userId from metadata", () => {
      const session = {
        metadata: { userId: "user-123" },
        client_reference_id: "ref-456",
      } as unknown as Stripe.Checkout.Session;

      expect(getUserIdFromCheckoutSession(session)).toBe("user-123");
    });

    it("should fall back to client_reference_id when no metadata userId", () => {
      const session = {
        metadata: {},
        client_reference_id: "ref-456",
      } as unknown as Stripe.Checkout.Session;

      expect(getUserIdFromCheckoutSession(session)).toBe("ref-456");
    });

    it("should return null when neither exists", () => {
      const session = {
        metadata: {},
        client_reference_id: null,
      } as unknown as Stripe.Checkout.Session;

      expect(getUserIdFromCheckoutSession(session)).toBeNull();
    });
  });

  describe("getUserIdFromSubscription", () => {
    it("should return userId from subscription metadata", () => {
      const subscription = {
        metadata: { userId: "user-789" },
      } as unknown as Stripe.Subscription;

      expect(getUserIdFromSubscription(subscription)).toBe("user-789");
    });

    it("should return null when no userId in metadata", () => {
      const subscription = {
        metadata: {},
      } as unknown as Stripe.Subscription;

      expect(getUserIdFromSubscription(subscription)).toBeNull();
    });
  });

  describe("extractSubscriptionId", () => {
    it("should extract subscription id when it is a string", () => {
      const subscription = "sub_123";
      expect(extractSubscriptionId(subscription)).toBe("sub_123");
    });

    it("should extract subscription id from object", () => {
      const subscription = { id: "sub_456" };
      expect(extractSubscriptionId(subscription)).toBe("sub_456");
    });

    it("should return null for undefined", () => {
      expect(extractSubscriptionId(undefined)).toBeNull();
    });

    it("should return null for null", () => {
      expect(extractSubscriptionId(null)).toBeNull();
    });
  });

  describe("mapStripeStatus", () => {
    it("should map active status", () => {
      expect(mapStripeStatus("active")).toBe("active");
    });

    it("should map canceled status", () => {
      expect(mapStripeStatus("canceled")).toBe("canceled");
    });

    it("should map past_due status", () => {
      expect(mapStripeStatus("past_due")).toBe("past_due");
    });

    it("should map trialing status", () => {
      expect(mapStripeStatus("trialing")).toBe("trialing");
    });

    it("should map incomplete to canceled", () => {
      expect(mapStripeStatus("incomplete")).toBe("canceled");
    });

    it("should map incomplete_expired to canceled", () => {
      expect(mapStripeStatus("incomplete_expired")).toBe("canceled");
    });

    it("should map unpaid to canceled", () => {
      expect(mapStripeStatus("unpaid")).toBe("canceled");
    });

    it("should map paused to canceled", () => {
      expect(mapStripeStatus("paused")).toBe("canceled");
    });
  });
});
