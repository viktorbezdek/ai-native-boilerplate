/**
 * Integration tests for the Checkout API Route
 *
 * Tests the POST /api/v1/checkout endpoint for:
 * - Authentication validation
 * - Input validation
 * - Price ID validation
 * - Successful checkout session creation
 * - Error handling
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockAuthSession, mockUser } from "../../mocks";
import {
  createMockRequest,
  expectErrorResponse,
  parseJsonResponse,
} from "../helpers";

// Mock functions at module level
const mockGetSession = vi.fn();
const mockCreateCheckoutSession = vi.fn();
const mockTrackServerEvent = vi.fn();
const mockApplyApiMiddleware = vi.fn();

// Test price IDs matching the actual PRICE_IDS from @repo/payments
const TEST_PRICE_IDS = {
  PRO_MONTHLY: "price_pro_monthly",
  PRO_YEARLY: "price_pro_yearly",
  TEAM_MONTHLY: "price_team_monthly",
  TEAM_YEARLY: "price_team_yearly",
};

describe("POST /api/v1/checkout", () => {
  // biome-ignore lint/suspicious/noExplicitAny: Test mock types are intentionally loose
  let POST: (request: any) => Promise<Response>;

  beforeEach(async () => {
    // Reset module cache
    vi.resetModules();

    // Reset all mocks
    mockGetSession.mockReset();
    mockCreateCheckoutSession.mockReset();
    mockTrackServerEvent.mockReset();
    mockApplyApiMiddleware.mockReset();

    // Default: authenticated user
    mockGetSession.mockResolvedValue(mockAuthSession);

    // Default: middleware passes
    mockApplyApiMiddleware.mockResolvedValue({ success: true, headers: {} });

    // Default: successful checkout session
    mockCreateCheckoutSession.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/pay/cs_test_123",
    });

    // Default: tracking succeeds silently
    mockTrackServerEvent.mockResolvedValue(undefined);

    // Set up mocks
    vi.doMock("next/headers", () => ({
      headers: vi.fn(() => Promise.resolve(new Headers())),
      cookies: vi.fn(() => ({
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
      })),
    }));

    vi.doMock("@/lib/auth", () => ({
      auth: {},
      getSession: mockGetSession,
    }));

    vi.doMock("@/lib/api", () => ({
      applyApiMiddleware: mockApplyApiMiddleware,
    }));

    vi.doMock("@/lib/analytics/server", () => ({
      trackServerEvent: mockTrackServerEvent,
    }));

    vi.doMock("@repo/payments", () => ({
      createCheckoutSession: mockCreateCheckoutSession,
      PRICE_IDS: TEST_PRICE_IDS,
    }));

    // Import the route handler with fresh mocks
    const routeModule = await import("@/app/api/v1/checkout/route");
    POST = routeModule.POST;
  });

  describe("Authentication", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetSession.mockResolvedValue(null);

      const request = createMockRequest({
        method: "POST",
        url: "http://localhost:3000/api/v1/checkout",
        body: { priceId: TEST_PRICE_IDS.PRO_MONTHLY },
      });

      const response = await POST(request);
      const result = await parseJsonResponse(response);

      expectErrorResponse(result, 401, "Unauthorized");
    });

    it("returns 401 when session has no user ID", async () => {
      mockGetSession.mockResolvedValue({
        ...mockAuthSession,
        user: { ...mockAuthSession.user, id: null },
      });

      const request = createMockRequest({
        method: "POST",
        url: "http://localhost:3000/api/v1/checkout",
        body: { priceId: TEST_PRICE_IDS.PRO_MONTHLY },
      });

      const response = await POST(request);
      const result = await parseJsonResponse(response);

      expectErrorResponse(result, 401, "Unauthorized");
    });

    it("returns 401 when session has no user email", async () => {
      mockGetSession.mockResolvedValue({
        ...mockAuthSession,
        user: { ...mockAuthSession.user, email: null },
      });

      const request = createMockRequest({
        method: "POST",
        url: "http://localhost:3000/api/v1/checkout",
        body: { priceId: TEST_PRICE_IDS.PRO_MONTHLY },
      });

      const response = await POST(request);
      const result = await parseJsonResponse(response);

      expectErrorResponse(result, 401, "Unauthorized");
    });
  });

  describe("Input Validation", () => {
    it("returns 400 when priceId is missing", async () => {
      const request = createMockRequest({
        method: "POST",
        url: "http://localhost:3000/api/v1/checkout",
        body: {},
      });

      const response = await POST(request);
      const result = await parseJsonResponse(response);

      expectErrorResponse(result, 400);
    });

    it("returns 400 when priceId is empty string", async () => {
      const request = createMockRequest({
        method: "POST",
        url: "http://localhost:3000/api/v1/checkout",
        body: { priceId: "" },
      });

      const response = await POST(request);
      const result = await parseJsonResponse(response);

      expectErrorResponse(result, 400, "Price ID is required");
    });

    it("returns 400 when priceId is invalid (not in PRICE_IDS)", async () => {
      const request = createMockRequest({
        method: "POST",
        url: "http://localhost:3000/api/v1/checkout",
        body: { priceId: "price_invalid_123" },
      });

      const response = await POST(request);
      const result = await parseJsonResponse(response);

      expectErrorResponse(result, 400, "Invalid price ID");
    });

    it("returns 400 when successUrl is not a valid URL", async () => {
      const request = createMockRequest({
        method: "POST",
        url: "http://localhost:3000/api/v1/checkout",
        body: {
          priceId: TEST_PRICE_IDS.PRO_MONTHLY,
          successUrl: "not-a-url",
        },
      });

      const response = await POST(request);
      const result = await parseJsonResponse(response);

      expectErrorResponse(result, 400);
    });

    it("returns 400 when cancelUrl is not a valid URL", async () => {
      const request = createMockRequest({
        method: "POST",
        url: "http://localhost:3000/api/v1/checkout",
        body: {
          priceId: TEST_PRICE_IDS.PRO_MONTHLY,
          cancelUrl: "invalid-url",
        },
      });

      const response = await POST(request);
      const result = await parseJsonResponse(response);

      expectErrorResponse(result, 400);
    });
  });

  describe("Middleware", () => {
    it("returns middleware error when rate limited", async () => {
      const rateLimitError = new Response(
        JSON.stringify({ error: "Rate limit exceeded" }),
        { status: 429 }
      );
      mockApplyApiMiddleware.mockResolvedValue({
        success: false,
        error: rateLimitError,
      });

      const request = createMockRequest({
        method: "POST",
        url: "http://localhost:3000/api/v1/checkout",
        body: { priceId: TEST_PRICE_IDS.PRO_MONTHLY },
      });

      const response = await POST(request);
      const result = await parseJsonResponse(response);

      expectErrorResponse(result, 429, "Rate limit exceeded");
    });

    it("applies strict rate limiting for checkout", async () => {
      const request = createMockRequest({
        method: "POST",
        url: "http://localhost:3000/api/v1/checkout",
        body: { priceId: TEST_PRICE_IDS.PRO_MONTHLY },
      });

      await POST(request);

      expect(mockApplyApiMiddleware).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          rateLimit: "strict",
          csrf: true,
          routePrefix: "checkout",
        })
      );
    });
  });

  describe("Successful Checkout", () => {
    it("creates checkout session and returns URL", async () => {
      const checkoutUrl = "https://checkout.stripe.com/pay/cs_test_123";
      mockCreateCheckoutSession.mockResolvedValue({
        id: "cs_test_123",
        url: checkoutUrl,
      });

      const request = createMockRequest({
        method: "POST",
        url: "http://localhost:3000/api/v1/checkout",
        body: { priceId: TEST_PRICE_IDS.PRO_MONTHLY },
      });

      const response = await POST(request);
      const { status, data } = await parseJsonResponse<{ url: string }>(
        response
      );

      expect(status).toBe(200);
      expect(data.url).toBe(checkoutUrl);
    });

    it("passes correct parameters to createCheckoutSession", async () => {
      const request = createMockRequest({
        method: "POST",
        url: "http://localhost:3000/api/v1/checkout",
        body: { priceId: TEST_PRICE_IDS.PRO_MONTHLY },
      });

      await POST(request);

      expect(mockCreateCheckoutSession).toHaveBeenCalledWith({
        priceId: TEST_PRICE_IDS.PRO_MONTHLY,
        userId: mockUser.id,
        userEmail: mockUser.email,
        successUrl: expect.stringContaining("/dashboard?checkout=success"),
        cancelUrl: expect.stringContaining("/pricing?checkout=cancelled"),
      });
    });

    it("uses custom successUrl when provided", async () => {
      const customSuccessUrl = "https://example.com/custom-success";

      const request = createMockRequest({
        method: "POST",
        url: "http://localhost:3000/api/v1/checkout",
        body: {
          priceId: TEST_PRICE_IDS.PRO_MONTHLY,
          successUrl: customSuccessUrl,
        },
      });

      await POST(request);

      expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          successUrl: customSuccessUrl,
        })
      );
    });

    it("uses custom cancelUrl when provided", async () => {
      const customCancelUrl = "https://example.com/custom-cancel";

      const request = createMockRequest({
        method: "POST",
        url: "http://localhost:3000/api/v1/checkout",
        body: {
          priceId: TEST_PRICE_IDS.PRO_MONTHLY,
          cancelUrl: customCancelUrl,
        },
      });

      await POST(request);

      expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          cancelUrl: customCancelUrl,
        })
      );
    });

    it("accepts all valid price IDs", async () => {
      for (const [, priceId] of Object.entries(TEST_PRICE_IDS)) {
        mockCreateCheckoutSession.mockResolvedValue({
          id: `cs_test_${priceId}`,
          url: `https://checkout.stripe.com/pay/cs_test_${priceId}`,
        });

        const request = createMockRequest({
          method: "POST",
          url: "http://localhost:3000/api/v1/checkout",
          body: { priceId },
        });

        const response = await POST(request);
        const { status } = await parseJsonResponse(response);

        expect(status).toBe(200);
      }
    });
  });

  describe("Analytics Tracking", () => {
    it("tracks checkout_started event", async () => {
      const request = createMockRequest({
        method: "POST",
        url: "http://localhost:3000/api/v1/checkout",
        body: { priceId: TEST_PRICE_IDS.PRO_YEARLY },
      });

      await POST(request);

      expect(mockTrackServerEvent).toHaveBeenCalledWith(
        mockUser.id,
        "checkout_started",
        { price_id: TEST_PRICE_IDS.PRO_YEARLY }
      );
    });
  });

  describe("Error Handling", () => {
    it("returns 500 when Stripe API fails", async () => {
      mockCreateCheckoutSession.mockRejectedValue(
        new Error("Stripe API error")
      );

      const request = createMockRequest({
        method: "POST",
        url: "http://localhost:3000/api/v1/checkout",
        body: { priceId: TEST_PRICE_IDS.PRO_MONTHLY },
      });

      const response = await POST(request);
      const result = await parseJsonResponse(response);

      expectErrorResponse(result, 500, "Failed to create checkout session");
    });

    it("returns 500 on unexpected errors", async () => {
      mockCreateCheckoutSession.mockRejectedValue(
        new TypeError("Unexpected error")
      );

      const request = createMockRequest({
        method: "POST",
        url: "http://localhost:3000/api/v1/checkout",
        body: { priceId: TEST_PRICE_IDS.PRO_MONTHLY },
      });

      const response = await POST(request);
      const result = await parseJsonResponse(response);

      expectErrorResponse(result, 500, "Failed to create checkout session");
    });

    it("does not leak error details in response", async () => {
      mockCreateCheckoutSession.mockRejectedValue(
        new Error("Internal Stripe secret: sk_live_xxx")
      );

      const request = createMockRequest({
        method: "POST",
        url: "http://localhost:3000/api/v1/checkout",
        body: { priceId: TEST_PRICE_IDS.PRO_MONTHLY },
      });

      const response = await POST(request);
      const { data } = await parseJsonResponse<{ error: string }>(response);

      // Error message should be generic, not containing secrets
      expect(data.error).toBe("Failed to create checkout session");
      expect(data.error).not.toContain("sk_live");
    });
  });
});
