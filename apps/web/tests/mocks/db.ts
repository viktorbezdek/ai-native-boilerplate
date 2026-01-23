import { vi } from "vitest";

/**
 * Mock drizzle operators - these are pass-through since mocks don't need real SQL generation
 */
export const eq = vi.fn((a, b) => ({ type: "eq", a, b }));
export const lt = vi.fn((a, b) => ({ type: "lt", a, b }));
export const gt = vi.fn((a, b) => ({ type: "gt", a, b }));
export const lte = vi.fn((a, b) => ({ type: "lte", a, b }));
export const gte = vi.fn((a, b) => ({ type: "gte", a, b }));
export const ne = vi.fn((a, b) => ({ type: "ne", a, b }));
export const asc = vi.fn((col) => ({ type: "asc", col }));
export const desc = vi.fn((col) => ({ type: "desc", col }));
export const and = vi.fn((...conditions) => ({ type: "and", conditions }));
export const or = vi.fn((...conditions) => ({ type: "or", conditions }));
export const sql = vi.fn((strings, ...values) => ({
  type: "sql",
  strings,
  values,
}));
export const count = vi.fn((col) => ({ type: "count", col }));

/**
 * Mock user data
 */
export const mockUser = {
  id: "user-123",
  email: "test@example.com",
  name: "Test User",
  image: "https://example.com/avatar.jpg",
  emailVerified: true,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

/**
 * Mock session data
 */
export const mockSession = {
  id: "session-123",
  userId: mockUser.id,
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
  createdAt: new Date(),
  updatedAt: new Date(),
  ipAddress: "127.0.0.1",
  userAgent: "Mozilla/5.0",
};

/**
 * Mock project data
 */
export const mockProject = {
  id: "project-123",
  name: "Test Project",
  description: "A test project for unit tests",
  userId: mockUser.id,
  isPublic: false,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

/**
 * Mock subscription data
 */
export const mockSubscription = {
  id: "sub-123",
  userId: mockUser.id,
  stripeCustomerId: "cus_123",
  stripeSubscriptionId: "sub_123",
  stripePriceId: "price_123",
  stripeProductId: "prod_123",
  status: "active" as const,
  currentPeriodStart: new Date("2024-01-01"),
  currentPeriodEnd: new Date("2024-02-01"),
  cancelAtPeriodEnd: false,
  canceledAt: null,
  trialStart: null,
  trialEnd: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

/**
 * Create mock database module
 */
export function createMockDb() {
  return {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    execute: vi.fn(),
  };
}

/**
 * Mock query functions
 */
export const mockQueries = {
  getUserById: vi.fn().mockResolvedValue(mockUser),
  getUserByEmail: vi.fn().mockResolvedValue(mockUser),
  getProjectById: vi.fn().mockResolvedValue(mockProject),
  getProjectByIdForUser: vi.fn().mockResolvedValue(mockProject),
  getProjectsForUser: vi.fn().mockResolvedValue({
    projects: [mockProject],
    total: 1,
  }),
  createProject: vi.fn().mockResolvedValue(mockProject),
  updateProject: vi.fn().mockResolvedValue(mockProject),
  deleteProject: vi.fn().mockResolvedValue(undefined),
  getSubscriptionByUserId: vi.fn().mockResolvedValue(mockSubscription),
};

/**
 * Reset all mock queries
 */
export function resetMockQueries() {
  for (const mock of Object.values(mockQueries)) {
    mock.mockClear();
  }
}
