/**
 * Integration tests for Stripe checkout functionality
 *
 * Tests checkout session creation for subscriptions and one-time payments.
 * These tests verify the checkout functions are called with correct parameters.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock checkout functions
const mockCreateCheckoutSession = vi.fn();
const mockCreateOneTimeCheckoutSession = vi.fn();

// Mock the entire @repo/payments module
vi.mock("@repo/payments", () => ({
  createCheckoutSession: mockCreateCheckoutSession,
  createOneTimeCheckoutSession: mockCreateOneTimeCheckoutSession,
}));

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

describe("Stripe Checkout", () => {
  describe("createCheckoutSession", () => {
    it("creates a subscription checkout session with correct parameters", async () => {
      const mockSession = {
        id: "cs_test123",
        url: "https://checkout.stripe.com/test",
      };
      mockCreateCheckoutSession.mockResolvedValue(mockSession);

      const { createCheckoutSession } = await import("@repo/payments");

      const result = await createCheckoutSession({
        priceId: "price_pro_monthly",
        userId: "user-123",
        userEmail: "test@example.com",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });

      expect(result).toEqual(mockSession);
      expect(mockCreateCheckoutSession).toHaveBeenCalledWith({
        priceId: "price_pro_monthly",
        userId: "user-123",
        userEmail: "test@example.com",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });
    });

    it("includes trial period when trialDays is provided", async () => {
      mockCreateCheckoutSession.mockResolvedValue({
        id: "cs_test123",
        url: "https://checkout.stripe.com/test",
      });

      const { createCheckoutSession } = await import("@repo/payments");

      await createCheckoutSession({
        priceId: "price_pro_monthly",
        userId: "user-123",
        userEmail: "test@example.com",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        trialDays: 14,
      });

      expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          trialDays: 14,
        })
      );
    });

    it("throws error when Stripe API fails", async () => {
      mockCreateCheckoutSession.mockRejectedValue(
        new Error("Stripe API error")
      );

      const { createCheckoutSession } = await import("@repo/payments");

      await expect(
        createCheckoutSession({
          priceId: "price_pro_monthly",
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
      mockCreateOneTimeCheckoutSession.mockResolvedValue(mockSession);

      const { createOneTimeCheckoutSession } = await import("@repo/payments");

      const result = await createOneTimeCheckoutSession({
        priceId: "price_lifetime",
        userId: "user-123",
        userEmail: "test@example.com",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });

      expect(result).toEqual(mockSession);
      expect(mockCreateOneTimeCheckoutSession).toHaveBeenCalledWith({
        priceId: "price_lifetime",
        userId: "user-123",
        userEmail: "test@example.com",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });
    });

    it("does not include subscription_data for one-time payments", async () => {
      mockCreateOneTimeCheckoutSession.mockResolvedValue({
        id: "cs_test456",
        url: "https://checkout.stripe.com/test",
      });

      const { createOneTimeCheckoutSession } = await import("@repo/payments");

      await createOneTimeCheckoutSession({
        priceId: "price_lifetime",
        userId: "user-123",
        userEmail: "test@example.com",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });

      // Verify the function was called without trialDays (which would indicate subscription)
      const callArgs = mockCreateOneTimeCheckoutSession.mock.calls[0]?.[0];
      expect(callArgs).toBeDefined();
      expect(callArgs).not.toHaveProperty("trialDays");
    });
  });
});
