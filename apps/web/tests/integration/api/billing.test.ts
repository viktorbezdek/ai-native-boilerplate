/**
 * Integration tests for the Billing API
 *
 * Tests the billing portal session creation endpoint.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockAuthSession, mockSubscription } from "../../mocks";
import {
  createMockRequest,
  expectErrorResponse,
  parseJsonResponse,
} from "../helpers";

// Create mock functions at module level
const mockGetSession = vi.fn();
const mockGetSubscriptionByUserId = vi.fn();
const mockCreateBillingPortalSession = vi.fn();

describe("POST /api/v1/billing", () => {
  // biome-ignore lint/suspicious/noExplicitAny: Test mock types are intentionally loose
  let POST: (request: any) => Promise<Response>;

  beforeEach(async () => {
    // Reset module cache
    vi.resetModules();

    // Reset all mocks
    mockGetSession.mockReset();
    mockGetSubscriptionByUserId.mockReset();
    mockCreateBillingPortalSession.mockReset();

    // Default: unauthenticated
    mockGetSession.mockResolvedValue(null);
    mockGetSubscriptionByUserId.mockResolvedValue(null);
    mockCreateBillingPortalSession.mockResolvedValue({
      url: "https://billing.stripe.com/session/123",
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

    vi.doMock("@repo/database/queries", () => ({
      getSubscriptionByUserId: mockGetSubscriptionByUserId,
    }));

    vi.doMock("@repo/payments", () => ({
      createBillingPortalSession: mockCreateBillingPortalSession,
    }));

    // Import the route handler with fresh mocks
    const routeModule = await import("@/app/api/v1/billing/route");
    POST = routeModule.POST;
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const request = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/v1/billing",
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expectErrorResponse(result, 401, "Unauthorized");
  });

  it("returns 400 when user has no subscription", async () => {
    mockGetSession.mockResolvedValue(mockAuthSession);
    mockGetSubscriptionByUserId.mockResolvedValue(null);

    const request = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/v1/billing",
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expectErrorResponse(result, 400, "No active subscription found");
  });

  it("returns 400 when subscription has no Stripe customer ID", async () => {
    mockGetSession.mockResolvedValue(mockAuthSession);
    mockGetSubscriptionByUserId.mockResolvedValue({
      ...mockSubscription,
      stripeCustomerId: null,
    });

    const request = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/v1/billing",
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expectErrorResponse(result, 400, "No active subscription found");
  });

  it("returns billing portal URL when user has valid subscription", async () => {
    mockGetSession.mockResolvedValue(mockAuthSession);
    mockGetSubscriptionByUserId.mockResolvedValue(mockSubscription);

    const request = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/v1/billing",
    });
    const response = await POST(request);
    const { status, data } = await parseJsonResponse<{ url: string }>(response);

    expect(status).toBe(200);
    expect(data.url).toBe("https://billing.stripe.com/session/123");
    expect(mockCreateBillingPortalSession).toHaveBeenCalledWith(
      mockSubscription.stripeCustomerId,
      expect.stringContaining("/settings")
    );
  });

  it("returns 500 when billing portal creation fails", async () => {
    mockGetSession.mockResolvedValue(mockAuthSession);
    mockGetSubscriptionByUserId.mockResolvedValue(mockSubscription);
    mockCreateBillingPortalSession.mockRejectedValue(
      new Error("Stripe API error")
    );

    const request = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/v1/billing",
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expectErrorResponse(result, 500, "Failed to create billing portal session");
  });
});
