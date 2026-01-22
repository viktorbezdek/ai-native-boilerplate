/**
 * Integration tests for the Checkout API
 *
 * Tests the checkout session creation endpoint.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockAuthSession } from "../../mocks";
import {
  createMockRequest,
  expectErrorResponse,
  parseJsonResponse,
} from "../helpers";

// Create mock functions at module level
const mockGetSession = vi.fn();
const mockCreateCheckoutSession = vi.fn();
const mockTrackServerEvent = vi.fn();

// Mock PRICE_IDS
const MOCK_PRICE_IDS = {
  PRO_MONTHLY: "price_pro_monthly",
  PRO_YEARLY: "price_pro_yearly",
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

    // Default: unauthenticated
    mockGetSession.mockResolvedValue(null);
    mockCreateCheckoutSession.mockResolvedValue({
      url: "https://checkout.stripe.com/test",
    });

    // Set up mocks
    vi.doMock("next/headers", () => ({
      headers: vi.fn(() => Promise.resolve(new Headers())),
      cookies: vi.fn(() => ({
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
      })),
    }));

    vi.doMock("@/lib/api", () => ({
      applyApiMiddleware: vi.fn(() =>
        Promise.resolve({ success: true, headers: {} })
      ),
    }));

    vi.doMock("@/lib/auth", () => ({
      auth: {},
      getSession: mockGetSession,
    }));

    vi.doMock("@/lib/analytics/server", () => ({
      trackServerEvent: mockTrackServerEvent,
    }));

    vi.doMock("@repo/payments", () => ({
      PRICE_IDS: MOCK_PRICE_IDS,
      createCheckoutSession: mockCreateCheckoutSession,
    }));

    // Import the route handler with fresh mocks
    const routeModule = await import("@/app/api/v1/checkout/route");
    POST = routeModule.POST;
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const request = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/v1/checkout",
      body: { priceId: "price_pro_monthly" },
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expectErrorResponse(result, 401, "Unauthorized");
  });

  it("returns 401 when user has no email", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "user-123" }, // No email
      session: mockAuthSession.session,
    });

    const request = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/v1/checkout",
      body: { priceId: "price_pro_monthly" },
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expectErrorResponse(result, 401, "Unauthorized");
  });

  it("returns 400 when priceId is missing", async () => {
    mockGetSession.mockResolvedValue(mockAuthSession);

    const request = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/v1/checkout",
      body: {},
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expectErrorResponse(result, 400);
  });

  it("returns 400 when priceId is empty", async () => {
    mockGetSession.mockResolvedValue(mockAuthSession);

    const request = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/v1/checkout",
      body: { priceId: "" },
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expectErrorResponse(result, 400);
  });

  it("returns 400 for invalid price ID", async () => {
    mockGetSession.mockResolvedValue(mockAuthSession);

    const request = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/v1/checkout",
      body: { priceId: "invalid_price_id" },
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expectErrorResponse(result, 400, "Invalid price ID");
  });

  it("creates checkout session with valid price ID", async () => {
    mockGetSession.mockResolvedValue(mockAuthSession);

    const request = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/v1/checkout",
      body: { priceId: "price_pro_monthly" },
    });
    const response = await POST(request);
    const { status, data } = await parseJsonResponse<{ url: string }>(response);

    expect(status).toBe(200);
    expect(data.url).toBe("https://checkout.stripe.com/test");
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        priceId: "price_pro_monthly",
        userId: mockAuthSession.user.id,
        userEmail: mockAuthSession.user.email,
      })
    );
  });

  it("tracks checkout_started event", async () => {
    mockGetSession.mockResolvedValue(mockAuthSession);

    const request = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/v1/checkout",
      body: { priceId: "price_pro_monthly" },
    });
    await POST(request);

    expect(mockTrackServerEvent).toHaveBeenCalledWith(
      mockAuthSession.user.id,
      "checkout_started",
      { price_id: "price_pro_monthly" }
    );
  });

  it("uses custom success and cancel URLs when provided", async () => {
    mockGetSession.mockResolvedValue(mockAuthSession);

    const request = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/v1/checkout",
      body: {
        priceId: "price_pro_monthly",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      },
    });
    await POST(request);

    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      })
    );
  });

  it("returns 500 when checkout creation fails", async () => {
    mockGetSession.mockResolvedValue(mockAuthSession);
    mockCreateCheckoutSession.mockRejectedValue(new Error("Stripe error"));

    const request = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/v1/checkout",
      body: { priceId: "price_pro_monthly" },
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expectErrorResponse(result, 500, "Failed to create checkout session");
  });
});
