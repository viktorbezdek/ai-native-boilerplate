/**
 * Unit tests for subscription query functions
 *
 * Tests: getSubscriptionByUserId, getSubscriptionByStripeCustomerId,
 * getSubscriptionByStripeSubscriptionId, upsertSubscription,
 * updateSubscriptionStatus, updateSubscriptionPeriod, deleteSubscription
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockSubscription, mockUser } from "../../mocks";

// Mock data
const testSubscription = {
  ...mockSubscription,
  id: "sub-test-123",
};

const newSubscriptionData = {
  userId: mockUser.id,
  stripeCustomerId: "cus_new_123",
  stripeSubscriptionId: "sub_new_123",
  stripePriceId: "price_new_123",
  stripeProductId: "prod_new_123",
  status: "active" as const,
  currentPeriodStart: new Date("2024-01-01"),
  currentPeriodEnd: new Date("2024-02-01"),
  cancelAtPeriodEnd: false,
};

// Mock functions at module level
const mockFindFirst = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();

describe("Subscription Queries", () => {
  beforeEach(async () => {
    // Reset module cache
    vi.resetModules();

    // Reset all mocks
    mockFindFirst.mockReset();
    mockUpdate.mockReset();
    mockInsert.mockReset();
    mockDelete.mockReset();

    // Default mock implementations
    mockFindFirst.mockResolvedValue(testSubscription);
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([testSubscription]),
        }),
      }),
    });
    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([testSubscription]),
      }),
    });
    mockDelete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    // Mock the database module
    vi.doMock("@repo/database", async () => {
      const actual = await vi.importActual("@repo/database");
      return {
        ...actual,
        db: {
          query: {
            subscriptions: {
              findFirst: mockFindFirst,
            },
          },
          update: () => mockUpdate(),
          insert: () => mockInsert(),
          delete: () => mockDelete(),
        },
      };
    });
  });

  describe("getSubscriptionByUserId", () => {
    it("returns subscription when found", async () => {
      mockFindFirst.mockResolvedValue(testSubscription);

      const { getSubscriptionByUserId } = await import(
        "@repo/database/queries"
      );
      const result = await getSubscriptionByUserId(mockUser.id);

      expect(result).toEqual(testSubscription);
      expect(mockFindFirst).toHaveBeenCalledOnce();
    });

    it("returns undefined when subscription not found", async () => {
      mockFindFirst.mockResolvedValue(undefined);

      const { getSubscriptionByUserId } = await import(
        "@repo/database/queries"
      );
      const result = await getSubscriptionByUserId("non-existent-user");

      expect(result).toBeUndefined();
    });

    it("handles database errors gracefully", async () => {
      mockFindFirst.mockRejectedValue(new Error("Database connection failed"));

      const { getSubscriptionByUserId } = await import(
        "@repo/database/queries"
      );

      await expect(getSubscriptionByUserId(mockUser.id)).rejects.toThrow(
        "Database connection failed"
      );
    });
  });

  describe("getSubscriptionByStripeCustomerId", () => {
    it("returns subscription when found", async () => {
      mockFindFirst.mockResolvedValue(testSubscription);

      const { getSubscriptionByStripeCustomerId } = await import(
        "@repo/database/queries"
      );
      const result = await getSubscriptionByStripeCustomerId("cus_123");

      expect(result).toEqual(testSubscription);
      expect(mockFindFirst).toHaveBeenCalledOnce();
    });

    it("returns undefined when subscription not found", async () => {
      mockFindFirst.mockResolvedValue(undefined);

      const { getSubscriptionByStripeCustomerId } = await import(
        "@repo/database/queries"
      );
      const result =
        await getSubscriptionByStripeCustomerId("cus_non_existent");

      expect(result).toBeUndefined();
    });
  });

  describe("getSubscriptionByStripeSubscriptionId", () => {
    it("returns subscription when found", async () => {
      mockFindFirst.mockResolvedValue(testSubscription);

      const { getSubscriptionByStripeSubscriptionId } = await import(
        "@repo/database/queries"
      );
      const result = await getSubscriptionByStripeSubscriptionId("sub_123");

      expect(result).toEqual(testSubscription);
      expect(mockFindFirst).toHaveBeenCalledOnce();
    });

    it("returns undefined when subscription not found", async () => {
      mockFindFirst.mockResolvedValue(undefined);

      const { getSubscriptionByStripeSubscriptionId } = await import(
        "@repo/database/queries"
      );
      const result =
        await getSubscriptionByStripeSubscriptionId("sub_non_existent");

      expect(result).toBeUndefined();
    });
  });

  describe("upsertSubscription", () => {
    it("creates new subscription when none exists", async () => {
      // First call (check existing) returns nothing
      mockFindFirst.mockResolvedValueOnce(undefined);

      const newSub = { ...testSubscription, id: "sub-new-123" };
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([newSub]),
        }),
      });

      const { upsertSubscription } = await import("@repo/database/queries");
      const result = await upsertSubscription(newSubscriptionData);

      expect(result).toEqual(newSub);
      expect(mockFindFirst).toHaveBeenCalledOnce();
    });

    it("updates existing subscription", async () => {
      // First call returns existing subscription
      mockFindFirst.mockResolvedValueOnce(testSubscription);

      const updatedSub = {
        ...testSubscription,
        status: "canceled" as const,
        updatedAt: expect.any(Date),
      };
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedSub]),
          }),
        }),
      });

      const { upsertSubscription } = await import("@repo/database/queries");
      const result = await upsertSubscription({
        ...newSubscriptionData,
        status: "canceled",
      });

      expect(result).toEqual(updatedSub);
    });

    it("throws error when insert fails", async () => {
      mockFindFirst.mockResolvedValueOnce(undefined);
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const { upsertSubscription } = await import("@repo/database/queries");

      await expect(upsertSubscription(newSubscriptionData)).rejects.toThrow(
        "Failed to create subscription"
      );
    });

    it("throws error when update fails", async () => {
      mockFindFirst.mockResolvedValueOnce(testSubscription);
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const { upsertSubscription } = await import("@repo/database/queries");

      await expect(upsertSubscription(newSubscriptionData)).rejects.toThrow(
        "Failed to update subscription"
      );
    });
  });

  describe("updateSubscriptionStatus", () => {
    it("updates subscription status successfully", async () => {
      const updatedSub = {
        ...testSubscription,
        status: "canceled" as const,
        cancelAtPeriodEnd: true,
      };
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedSub]),
          }),
        }),
      });

      const { updateSubscriptionStatus } = await import(
        "@repo/database/queries"
      );
      const result = await updateSubscriptionStatus(
        "sub_123",
        "canceled",
        true
      );

      expect(result.status).toBe("canceled");
      expect(result.cancelAtPeriodEnd).toBe(true);
    });

    it("updates status with default cancelAtPeriodEnd", async () => {
      const updatedSub = {
        ...testSubscription,
        status: "past_due" as const,
        cancelAtPeriodEnd: false,
      };
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedSub]),
          }),
        }),
      });

      const { updateSubscriptionStatus } = await import(
        "@repo/database/queries"
      );
      const result = await updateSubscriptionStatus("sub_123", "past_due");

      expect(result.status).toBe("past_due");
      expect(result.cancelAtPeriodEnd).toBe(false);
    });

    it("throws error when subscription not found", async () => {
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const { updateSubscriptionStatus } = await import(
        "@repo/database/queries"
      );

      await expect(
        updateSubscriptionStatus("sub_non_existent", "active")
      ).rejects.toThrow("Subscription not found");
    });

    it("handles all valid subscription statuses", async () => {
      const statuses = ["active", "canceled", "past_due", "trialing"] as const;

      for (const status of statuses) {
        mockUpdate.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([
                {
                  ...testSubscription,
                  status,
                },
              ]),
            }),
          }),
        });

        const { updateSubscriptionStatus } = await import(
          "@repo/database/queries"
        );
        const result = await updateSubscriptionStatus("sub_123", status);

        expect(result.status).toBe(status);
        vi.resetModules();
      }
    });
  });

  describe("updateSubscriptionPeriod", () => {
    it("updates subscription period successfully", async () => {
      const newStart = new Date("2024-02-01");
      const newEnd = new Date("2024-03-01");
      const updatedSub = {
        ...testSubscription,
        currentPeriodStart: newStart,
        currentPeriodEnd: newEnd,
      };
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedSub]),
          }),
        }),
      });

      const { updateSubscriptionPeriod } = await import(
        "@repo/database/queries"
      );
      const result = await updateSubscriptionPeriod(
        "sub_123",
        newStart,
        newEnd
      );

      expect(result.currentPeriodStart).toEqual(newStart);
      expect(result.currentPeriodEnd).toEqual(newEnd);
    });

    it("throws error when subscription not found", async () => {
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const { updateSubscriptionPeriod } = await import(
        "@repo/database/queries"
      );

      await expect(
        updateSubscriptionPeriod("sub_non_existent", new Date(), new Date())
      ).rejects.toThrow("Subscription not found");
    });

    it("handles period dates correctly", async () => {
      const start = new Date("2024-01-15T10:30:00Z");
      const end = new Date("2024-02-15T10:30:00Z");
      const updatedSub = {
        ...testSubscription,
        currentPeriodStart: start,
        currentPeriodEnd: end,
      };
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedSub]),
          }),
        }),
      });

      const { updateSubscriptionPeriod } = await import(
        "@repo/database/queries"
      );
      const result = await updateSubscriptionPeriod("sub_123", start, end);

      expect(result.currentPeriodStart.getTime()).toBe(start.getTime());
      expect(result.currentPeriodEnd.getTime()).toBe(end.getTime());
    });
  });

  describe("deleteSubscription", () => {
    it("deletes subscription successfully", async () => {
      mockDelete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      const { deleteSubscription } = await import("@repo/database/queries");

      await expect(deleteSubscription(mockUser.id)).resolves.toBeUndefined();
    });

    it("handles non-existent subscription gracefully", async () => {
      mockDelete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      const { deleteSubscription } = await import("@repo/database/queries");

      // Should not throw even if subscription doesn't exist
      await expect(
        deleteSubscription("non-existent-user")
      ).resolves.toBeUndefined();
    });

    it("handles database errors", async () => {
      mockDelete.mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error("Database error")),
      });

      const { deleteSubscription } = await import("@repo/database/queries");

      await expect(deleteSubscription(mockUser.id)).rejects.toThrow(
        "Database error"
      );
    });
  });
});

describe("Subscription Query Edge Cases", () => {
  beforeEach(() => {
    vi.resetModules();
    mockFindFirst.mockReset();
    mockUpdate.mockReset();
    mockInsert.mockReset();
    mockDelete.mockReset();

    vi.doMock("@repo/database", async () => {
      const actual = await vi.importActual("@repo/database");
      return {
        ...actual,
        db: {
          query: {
            subscriptions: {
              findFirst: mockFindFirst,
            },
          },
          update: () => mockUpdate(),
          insert: () => mockInsert(),
          delete: () => mockDelete(),
        },
      };
    });
  });

  it("handles subscription with all nullable fields as null", async () => {
    const minimalSubscription = {
      id: "sub-minimal",
      userId: mockUser.id,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripePriceId: null,
      stripeProductId: null,
      status: "trialing" as const,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      trialStart: null,
      trialEnd: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockFindFirst.mockResolvedValue(minimalSubscription);

    const { getSubscriptionByUserId } = await import("@repo/database/queries");
    const result = await getSubscriptionByUserId(mockUser.id);

    expect(result).toEqual(minimalSubscription);
    expect(result?.stripeCustomerId).toBeNull();
    expect(result?.currentPeriodStart).toBeNull();
  });

  it("handles subscription with trial dates", async () => {
    const trialSubscription = {
      ...testSubscription,
      status: "trialing" as const,
      trialStart: new Date("2024-01-01"),
      trialEnd: new Date("2024-01-14"),
    };
    mockFindFirst.mockResolvedValue(trialSubscription);

    const { getSubscriptionByUserId } = await import("@repo/database/queries");
    const result = await getSubscriptionByUserId(mockUser.id);

    expect(result?.status).toBe("trialing");
    expect(result?.trialStart).toEqual(new Date("2024-01-01"));
    expect(result?.trialEnd).toEqual(new Date("2024-01-14"));
  });

  it("handles subscription with canceledAt date", async () => {
    const canceledSubscription = {
      ...testSubscription,
      status: "canceled" as const,
      cancelAtPeriodEnd: false,
      canceledAt: new Date("2024-01-15"),
    };
    mockFindFirst.mockResolvedValue(canceledSubscription);

    const { getSubscriptionByUserId } = await import("@repo/database/queries");
    const result = await getSubscriptionByUserId(mockUser.id);

    expect(result?.status).toBe("canceled");
    expect(result?.canceledAt).toEqual(new Date("2024-01-15"));
  });

  it("handles concurrent upsert operations", async () => {
    // Simulate race condition where subscription is created between check and insert
    mockFindFirst
      .mockResolvedValueOnce(undefined) // First check returns nothing
      .mockResolvedValueOnce(testSubscription); // But subscription now exists

    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([testSubscription]),
      }),
    });

    const { upsertSubscription } = await import("@repo/database/queries");
    const result = await upsertSubscription(newSubscriptionData);

    // Should succeed with the inserted subscription
    expect(result).toEqual(testSubscription);
  });
});
