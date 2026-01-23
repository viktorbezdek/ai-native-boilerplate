import type Stripe from "stripe";
/**
 * Integration tests for Stripe webhook handling
 *
 * Tests the webhook event construction and handling for various Stripe events.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// Mock Stripe at module level
const mockConstructEvent = vi.fn();
const mockSubscriptionsRetrieve = vi.fn();

vi.mock("@repo/payments", () => ({
  stripe: {
    webhooks: {
      constructEvent: mockConstructEvent,
    },
    subscriptions: {
      retrieve: mockSubscriptionsRetrieve,
    },
  },
}));

// Mock database
const mockDbSelect = vi.fn();
const mockDbUpdate = vi.fn();
const mockDbInsert = vi.fn();

vi.mock("@repo/database", () => ({
  db: {
    select: () => mockDbSelect(),
    update: () => mockDbUpdate(),
    insert: () => mockDbInsert(),
  },
  subscriptions: {
    id: Symbol("subscriptions.id"),
    stripeSubscriptionId: Symbol("subscriptions.stripeSubscriptionId"),
  },
  // Re-export drizzle-orm functions that are now exported from @repo/database
  eq: vi.fn((field, value) => ({ field, value })),
}));

// Mock analytics
vi.mock("@/lib/analytics/server", () => ({
  trackServerEvent: vi.fn(),
  identifyServerUser: vi.fn(),
}));

// Mock environment
const originalEnv = process.env;

describe("Stripe Webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, STRIPE_WEBHOOK_SECRET: "whsec_test123" };

    // Setup default mock implementations
    mockDbSelect.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([]),
        })),
      })),
    });

    mockDbUpdate.mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    });

    mockDbInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("constructWebhookEvent", () => {
    it("successfully constructs event with valid signature", async () => {
      const mockEvent = {
        id: "evt_test123",
        type: "checkout.session.completed",
        data: { object: {} },
      } as unknown as Stripe.Event;

      mockConstructEvent.mockReturnValue(mockEvent);

      const { constructWebhookEvent } = await import("@/lib/stripe/webhooks");
      const result = await constructWebhookEvent("payload", "sig_test");

      expect(result).toEqual(mockEvent);
      expect(mockConstructEvent).toHaveBeenCalledWith(
        "payload",
        "sig_test",
        "whsec_test123"
      );
    });

    it("throws error with invalid signature", async () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      const { constructWebhookEvent } = await import("@/lib/stripe/webhooks");

      await expect(
        constructWebhookEvent("payload", "invalid_sig")
      ).rejects.toThrow("Invalid signature");
    });

    it("throws error when webhook secret is not configured", async () => {
      // Clear the modules and reset env
      vi.resetModules();
      process.env = { ...originalEnv };
      process.env.STRIPE_WEBHOOK_SECRET = undefined;

      // Re-mock the modules
      vi.doMock("@repo/payments", () => ({
        stripe: {
          webhooks: {
            constructEvent: mockConstructEvent,
          },
          subscriptions: {
            retrieve: mockSubscriptionsRetrieve,
          },
        },
      }));

      vi.doMock("@repo/database", () => ({
        db: {
          select: () => mockDbSelect(),
          update: () => mockDbUpdate(),
          insert: () => mockDbInsert(),
        },
        subscriptions: {
          stripeSubscriptionId: Symbol("subscriptions.stripeSubscriptionId"),
        },
      }));

      vi.doMock("drizzle-orm", () => ({
        eq: vi.fn(),
      }));

      vi.doMock("@/lib/analytics/server", () => ({
        trackServerEvent: vi.fn(),
        identifyServerUser: vi.fn(),
      }));

      const { constructWebhookEvent } = await import("@/lib/stripe/webhooks");

      await expect(
        constructWebhookEvent("payload", "sig_test")
      ).rejects.toThrow("STRIPE_WEBHOOK_SECRET is not configured");
    });
  });

  describe("handleWebhookEvent", () => {
    const createMockCheckoutSession = (
      overrides: Partial<Stripe.Checkout.Session> = {}
    ): Stripe.Checkout.Session =>
      ({
        id: "cs_test123",
        mode: "subscription",
        subscription: "sub_123",
        client_reference_id: "user-123",
        metadata: { userId: "user-123" },
        amount_total: 1999,
        currency: "usd",
        ...overrides,
      }) as Stripe.Checkout.Session;

    const createMockSubscription = (
      overrides: Partial<Stripe.Subscription> = {}
    ): Stripe.Subscription =>
      ({
        id: "sub_123",
        customer: "cus_123",
        status: "active",
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        cancel_at_period_end: false,
        canceled_at: null,
        trial_start: null,
        trial_end: null,
        metadata: { userId: "user-123" },
        items: {
          data: [
            {
              id: "si_123",
              price: {
                id: "price_123",
                product: "prod_123",
                recurring: { interval: "month" },
              },
            },
          ],
        },
        ...overrides,
      }) as unknown as Stripe.Subscription;

    it("handles checkout.session.completed event", async () => {
      const mockSession = createMockCheckoutSession();
      const mockSubscription = createMockSubscription();
      mockSubscriptionsRetrieve.mockResolvedValue(mockSubscription);

      const { handleWebhookEvent } = await import("@/lib/stripe/webhooks");

      await handleWebhookEvent({
        id: "evt_test",
        type: "checkout.session.completed",
        data: { object: mockSession },
      } as Stripe.Event);

      expect(mockSubscriptionsRetrieve).toHaveBeenCalledWith("sub_123");
    });

    it("handles customer.subscription.updated event", async () => {
      const mockSubscription = createMockSubscription();

      const { handleWebhookEvent } = await import("@/lib/stripe/webhooks");

      await handleWebhookEvent({
        id: "evt_test",
        type: "customer.subscription.updated",
        data: { object: mockSubscription },
      } as Stripe.Event);

      // Verify db operations were called
      expect(mockDbSelect).toHaveBeenCalled();
    });

    it("handles customer.subscription.deleted event", async () => {
      const mockSubscription = createMockSubscription({ status: "canceled" });

      const { handleWebhookEvent } = await import("@/lib/stripe/webhooks");

      await handleWebhookEvent({
        id: "evt_test",
        type: "customer.subscription.deleted",
        data: { object: mockSubscription },
      } as Stripe.Event);

      expect(mockDbUpdate).toHaveBeenCalled();
    });

    it("logs unhandled event types without throwing", async () => {
      const consoleSpy = vi
        .spyOn(console, "log")
        .mockImplementation(Function.prototype as () => void);

      const { handleWebhookEvent } = await import("@/lib/stripe/webhooks");

      await expect(
        handleWebhookEvent({
          id: "evt_test",
          type: "some.unknown.event" as Stripe.Event["type"],
          data: { object: {} },
        } as Stripe.Event)
      ).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        "Unhandled event type: some.unknown.event"
      );

      consoleSpy.mockRestore();
    });

    it("handles subscription with empty items array", async () => {
      const mockSubscription = createMockSubscription();
      // Remove items to simulate empty array
      mockSubscription.items = {
        data: [],
      } as unknown as Stripe.Subscription["items"];
      mockSubscription.metadata = { userId: "user-123" };

      const { handleWebhookEvent } = await import("@/lib/stripe/webhooks");

      // This should throw because of our fix in Task 1.2
      await expect(
        handleWebhookEvent({
          id: "evt_test",
          type: "customer.subscription.updated",
          data: { object: mockSubscription },
        } as Stripe.Event)
      ).rejects.toThrow("has no items");
    });
  });

  describe("mapStatus", () => {
    // We can't directly test mapStatus since it's not exported,
    // but we can test it indirectly through subscription handling

    it("maps active status correctly", async () => {
      const mockSubscription = {
        id: "sub_123",
        customer: "cus_123",
        status: "active" as const,
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        cancel_at_period_end: false,
        canceled_at: null,
        trial_start: null,
        trial_end: null,
        metadata: { userId: "user-123" },
        items: {
          data: [
            {
              price: {
                id: "price_123",
                product: "prod_123",
              },
            },
          ],
        },
      };

      // The subscription should be saved with active status
      mockDbSelect.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([{ id: "existing" }]),
          })),
        })),
      });

      const { handleWebhookEvent } = await import("@/lib/stripe/webhooks");

      await handleWebhookEvent({
        id: "evt_test",
        type: "customer.subscription.updated",
        data: { object: mockSubscription },
      } as unknown as Stripe.Event);

      expect(mockDbUpdate).toHaveBeenCalled();
    });

    it("maps past_due status correctly", async () => {
      const mockSubscription = {
        id: "sub_123",
        customer: "cus_123",
        status: "past_due" as const,
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        cancel_at_period_end: false,
        canceled_at: null,
        trial_start: null,
        trial_end: null,
        metadata: { userId: "user-123" },
        items: {
          data: [
            {
              price: {
                id: "price_123",
                product: "prod_123",
              },
            },
          ],
        },
      };

      mockDbSelect.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      });

      const { handleWebhookEvent } = await import("@/lib/stripe/webhooks");

      await handleWebhookEvent({
        id: "evt_test",
        type: "customer.subscription.updated",
        data: { object: mockSubscription },
      } as unknown as Stripe.Event);

      expect(mockDbInsert).toHaveBeenCalled();
    });

    it("maps incomplete status to canceled with warning", async () => {
      const consoleSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(Function.prototype as () => void);

      const mockSubscription = {
        id: "sub_123",
        customer: "cus_123",
        status: "incomplete" as const,
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        cancel_at_period_end: false,
        canceled_at: null,
        trial_start: null,
        trial_end: null,
        metadata: { userId: "user-123" },
        items: {
          data: [
            {
              price: {
                id: "price_123",
                product: "prod_123",
              },
            },
          ],
        },
      };

      const { handleWebhookEvent } = await import("@/lib/stripe/webhooks");

      await handleWebhookEvent({
        id: "evt_test",
        type: "customer.subscription.updated",
        data: { object: mockSubscription },
      } as unknown as Stripe.Event);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Mapping subscription status "incomplete" to "canceled"'
        )
      );

      consoleSpy.mockRestore();
    });
  });

  describe("invoice events", () => {
    const createMockInvoice = (
      overrides: Partial<Stripe.Invoice> = {}
    ): Stripe.Invoice =>
      ({
        id: "in_test123",
        customer: "cus_123",
        parent: {
          subscription_details: {
            subscription: "sub_123",
          },
        },
        amount_paid: 1999,
        amount_due: 1999,
        currency: "usd",
        attempt_count: 1,
        ...overrides,
      }) as Stripe.Invoice;

    it("handles invoice.payment_succeeded event", async () => {
      const mockInvoice = createMockInvoice();
      const mockSubscription = {
        id: "sub_123",
        metadata: { userId: "user-123" },
      };
      mockSubscriptionsRetrieve.mockResolvedValue(mockSubscription);

      const { handleWebhookEvent } = await import("@/lib/stripe/webhooks");

      await expect(
        handleWebhookEvent({
          id: "evt_test",
          type: "invoice.payment_succeeded",
          data: { object: mockInvoice },
        } as Stripe.Event)
      ).resolves.not.toThrow();

      expect(mockSubscriptionsRetrieve).toHaveBeenCalledWith("sub_123");
    });

    it("handles invoice.payment_failed event", async () => {
      const mockInvoice = createMockInvoice();
      const mockSubscription = {
        id: "sub_123",
        metadata: { userId: "user-123" },
      };
      mockSubscriptionsRetrieve.mockResolvedValue(mockSubscription);

      const { handleWebhookEvent } = await import("@/lib/stripe/webhooks");

      await expect(
        handleWebhookEvent({
          id: "evt_test",
          type: "invoice.payment_failed",
          data: { object: mockInvoice },
        } as Stripe.Event)
      ).resolves.not.toThrow();

      expect(mockSubscriptionsRetrieve).toHaveBeenCalledWith("sub_123");
    });
  });
});
