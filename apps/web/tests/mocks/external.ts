import type { Mock } from "vitest";
import { vi } from "vitest";

/**
 * Mock Stripe checkout session
 */
export const mockCheckoutSession = {
  id: "cs_test_123",
  url: "https://checkout.stripe.com/c/pay/cs_test_123",
  mode: "subscription",
  customer: "cus_123",
  subscription: "sub_123",
  payment_status: "paid",
  status: "complete",
};

/**
 * Mock Stripe subscription
 */
export const mockStripeSubscription = {
  id: "sub_123",
  customer: "cus_123",
  status: "active",
  current_period_start: Math.floor(Date.now() / 1000),
  current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
  cancel_at_period_end: false,
  canceled_at: null,
  items: {
    data: [
      {
        id: "si_123",
        price: {
          id: "price_123",
          product: "prod_123",
        },
      },
    ],
  },
  metadata: {
    userId: "user-123",
  },
};

interface MockStripe {
  checkout: { sessions: { create: Mock; retrieve: Mock } };
  subscriptions: { retrieve: Mock; update: Mock; cancel: Mock };
  customers: { create: Mock; list: Mock };
  billingPortal: { sessions: { create: Mock } };
  webhooks: { constructEvent: Mock };
  invoices: { list: Mock; retrieveUpcoming: Mock };
}

/**
 * Mock Stripe module
 */
export const mockStripe: MockStripe = {
  checkout: {
    sessions: {
      create: vi.fn().mockResolvedValue(mockCheckoutSession),
      retrieve: vi.fn().mockResolvedValue(mockCheckoutSession),
    },
  },
  subscriptions: {
    retrieve: vi.fn().mockResolvedValue(mockStripeSubscription),
    update: vi.fn().mockResolvedValue(mockStripeSubscription),
    cancel: vi.fn().mockResolvedValue(mockStripeSubscription),
  },
  customers: {
    create: vi
      .fn()
      .mockResolvedValue({ id: "cus_123", email: "test@example.com" }),
    list: vi.fn().mockResolvedValue({ data: [] }),
  },
  billingPortal: {
    sessions: {
      create: vi
        .fn()
        .mockResolvedValue({ url: "https://billing.stripe.com/session/123" }),
    },
  },
  webhooks: {
    constructEvent: vi.fn(),
  },
  invoices: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    retrieveUpcoming: vi.fn().mockResolvedValue(null),
  },
};

/**
 * Mock Resend email response
 */
export const mockEmailResponse = {
  id: "email_123",
  from: "noreply@example.com",
  to: ["test@example.com"],
  subject: "Test Email",
};

interface MockResend {
  emails: { send: Mock };
}

/**
 * Mock Resend module
 */
export const mockResend: MockResend = {
  emails: {
    send: vi.fn().mockResolvedValue({ data: mockEmailResponse, error: null }),
  },
};

interface MockPostHog {
  capture: Mock;
  identify: Mock;
  reset: Mock;
  setPersonProperties: Mock;
  isFeatureEnabled: Mock;
  getFeatureFlag: Mock;
  featureFlags: { override: Mock };
}

/**
 * Mock PostHog module
 */
export const mockPostHog: MockPostHog = {
  capture: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
  setPersonProperties: vi.fn(),
  isFeatureEnabled: vi.fn().mockReturnValue(false),
  getFeatureFlag: vi.fn().mockReturnValue(null),
  featureFlags: {
    override: vi.fn(),
  },
};

/**
 * Setup all external service mocks
 */
export function setupExternalMocks() {
  vi.mock("stripe", () => ({
    default: vi.fn(() => mockStripe),
  }));

  vi.mock("resend", () => ({
    Resend: vi.fn(() => mockResend),
  }));

  vi.mock("posthog-js", () => ({
    default: mockPostHog,
  }));

  vi.mock("posthog-node", () => ({
    PostHog: vi.fn(() => ({
      capture: vi.fn(),
      identify: vi.fn(),
      isFeatureEnabled: vi.fn().mockResolvedValue(false),
      getAllFlags: vi.fn().mockResolvedValue({}),
      shutdown: vi.fn(),
    })),
  }));
}

/**
 * Reset all external mocks
 */
export function resetExternalMocks() {
  Object.values(mockStripe.checkout.sessions).forEach((mock) => {
    mock.mockClear();
  });
  Object.values(mockStripe.subscriptions).forEach((mock) => {
    mock.mockClear();
  });
  Object.values(mockStripe.customers).forEach((mock) => {
    mock.mockClear();
  });
  mockResend.emails.send.mockClear();
  mockPostHog.capture.mockClear();
  mockPostHog.identify.mockClear();
  mockPostHog.reset.mockClear();
}
