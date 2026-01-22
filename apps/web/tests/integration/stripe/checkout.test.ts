import type { PriceId } from "@repo/payments";
/**
 * Integration tests for Stripe checkout functionality
 *
 * Tests checkout session creation for subscriptions and one-time payments.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Stripe at module level
const mockCheckoutCreate = vi.fn();

vi.mock("stripe", () => ({
  default: vi.fn(() => ({
    checkout: {
      sessions: {
        create: mockCheckoutCreate,
      },
    },
  })),
}));

describe("Stripe Checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createCheckoutSession", () => {
    it("creates a subscription checkout session with correct parameters", async () => {
      const mockSession = {
        id: "cs_test123",
        url: "https://checkout.stripe.com/test",
      };
      mockCheckoutCreate.mockResolvedValue(mockSession);

      const { createCheckoutSession } = await import("@repo/payments");

      const result = await createCheckoutSession({
        priceId: "price_pro_monthly" as PriceId,
        userId: "user-123",
        userEmail: "test@example.com",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });

      expect(result).toEqual(mockSession);
      expect(mockCheckoutCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "subscription",
          payment_method_types: ["card"],
          line_items: [
            {
              price: "price_pro_monthly",
              quantity: 1,
            },
          ],
          success_url: "https://example.com/success",
          cancel_url: "https://example.com/cancel",
          customer_email: "test@example.com",
          client_reference_id: "user-123",
          metadata: {
            userId: "user-123",
          },
          allow_promotion_codes: true,
        })
      );
    });

    it("includes trial period when trialDays is provided", async () => {
      mockCheckoutCreate.mockResolvedValue({
        id: "cs_test123",
        url: "https://checkout.stripe.com/test",
      });

      const { createCheckoutSession } = await import("@repo/payments");

      await createCheckoutSession({
        priceId: "price_pro_monthly" as PriceId,
        userId: "user-123",
        userEmail: "test@example.com",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        trialDays: 14,
      });

      expect(mockCheckoutCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_data: expect.objectContaining({
            trial_period_days: 14,
          }),
        })
      );
    });

    it("throws error when Stripe API fails", async () => {
      mockCheckoutCreate.mockRejectedValue(new Error("Stripe API error"));

      const { createCheckoutSession } = await import("@repo/payments");

      await expect(
        createCheckoutSession({
          priceId: "price_pro_monthly" as PriceId,
          userId: "user-123",
          userEmail: "test@example.com",
          successUrl: "https://example.com/success",
          cancelUrl: "https://example.com/cancel",
        })
      ).rejects.toThrow("Stripe API error");
    });
  });

  describe("createOneTimeCheckoutSession", () => {
    it("creates a one-time payment checkout session", async () => {
      const mockSession = {
        id: "cs_test456",
        url: "https://checkout.stripe.com/test",
      };
      mockCheckoutCreate.mockResolvedValue(mockSession);

      const { createOneTimeCheckoutSession } = await import("@repo/payments");

      const result = await createOneTimeCheckoutSession({
        priceId: "price_lifetime" as PriceId,
        userId: "user-123",
        userEmail: "test@example.com",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });

      expect(result).toEqual(mockSession);
      expect(mockCheckoutCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "payment",
          payment_method_types: ["card"],
          line_items: [
            {
              price: "price_lifetime",
              quantity: 1,
            },
          ],
        })
      );
    });

    it("does not include subscription_data for one-time payments", async () => {
      mockCheckoutCreate.mockResolvedValue({
        id: "cs_test456",
        url: "https://checkout.stripe.com/test",
      });

      const { createOneTimeCheckoutSession } = await import("@repo/payments");

      await createOneTimeCheckoutSession({
        priceId: "price_lifetime" as PriceId,
        userId: "user-123",
        userEmail: "test@example.com",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });

      const callArgs = mockCheckoutCreate.mock.calls[0]?.[0];
      expect(callArgs).toBeDefined();
      expect(callArgs).not.toHaveProperty("subscription_data");
    });
  });
});
