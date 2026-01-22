/**
 * Integration tests for the Users API
 *
 * Tests the user profile retrieval and update endpoints.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockAuthSession, mockUser } from "../../mocks";
import {
  createMockRequest,
  expectErrorResponse,
  parseJsonResponse,
} from "../helpers";

// Create mock functions at module level
const mockGetSession = vi.fn();
const mockDbQueryUsers = {
  findFirst: vi.fn(),
};
const mockDbUpdate = vi.fn();

// Mock users schema
const mockUsersSchema = {
  id: Symbol("users.id"),
  name: Symbol("users.name"),
  email: Symbol("users.email"),
  emailVerified: Symbol("users.emailVerified"),
  image: Symbol("users.image"),
  createdAt: Symbol("users.createdAt"),
  updatedAt: Symbol("users.updatedAt"),
};

describe("GET /api/v1/users", () => {
  // biome-ignore lint/suspicious/noExplicitAny: Test mock types are intentionally loose
  let GET: (request: any) => Promise<Response>;

  beforeEach(async () => {
    // Reset module cache
    vi.resetModules();

    // Reset all mocks
    mockGetSession.mockReset();
    mockDbQueryUsers.findFirst.mockReset();

    // Default: unauthenticated
    mockGetSession.mockResolvedValue(null);
    mockDbQueryUsers.findFirst.mockResolvedValue(null);

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

    vi.doMock("@repo/database", () => ({
      db: {
        query: {
          users: mockDbQueryUsers,
        },
        update: () => mockDbUpdate(),
      },
      users: mockUsersSchema,
    }));

    vi.doMock("drizzle-orm", () => ({
      eq: vi.fn((field, value) => ({ field, value })),
    }));

    vi.doMock("@repo/validations", () => ({
      createErrorResponse: (message: string, status: number) =>
        new Response(JSON.stringify({ error: message }), { status }),
      createSuccessResponse: (data: unknown) =>
        new Response(JSON.stringify({ data }), { status: 200 }),
      updateUserSchema: {
        safeParse: (data: unknown) => {
          if (typeof data !== "object" || data === null) {
            return { success: false, error: { issues: [] } };
          }
          return { success: true, data };
        },
      },
    }));

    // Import the route handler with fresh mocks
    const routeModule = await import("@/app/api/v1/users/route");
    GET = routeModule.GET;
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const request = createMockRequest({
      url: "http://localhost:3000/api/v1/users",
    });
    const response = await GET(request);
    const result = await parseJsonResponse(response);

    expectErrorResponse(result, 401, "Unauthorized");
  });

  it("returns 404 when user not found in database", async () => {
    mockGetSession.mockResolvedValue(mockAuthSession);
    mockDbQueryUsers.findFirst.mockResolvedValue(null);

    const request = createMockRequest({
      url: "http://localhost:3000/api/v1/users",
    });
    const response = await GET(request);
    const result = await parseJsonResponse(response);

    expectErrorResponse(result, 404, "User not found");
  });

  it("returns user data when authenticated", async () => {
    mockGetSession.mockResolvedValue(mockAuthSession);
    mockDbQueryUsers.findFirst.mockResolvedValue({
      id: mockUser.id,
      name: mockUser.name,
      email: mockUser.email,
      emailVerified: mockUser.emailVerified,
      image: mockUser.image,
      createdAt: mockUser.createdAt,
      updatedAt: mockUser.updatedAt,
    });

    const request = createMockRequest({
      url: "http://localhost:3000/api/v1/users",
    });
    const response = await GET(request);
    const { status, data } = await parseJsonResponse<{
      data: typeof mockUser;
    }>(response);

    expect(status).toBe(200);
    expect(data.data.id).toBe(mockUser.id);
    expect(data.data.email).toBe(mockUser.email);
  });
});

describe("PATCH /api/v1/users", () => {
  // biome-ignore lint/suspicious/noExplicitAny: Test mock types are intentionally loose
  let PATCH: (request: any) => Promise<Response>;

  beforeEach(async () => {
    // Reset module cache
    vi.resetModules();

    // Reset all mocks
    mockGetSession.mockReset();
    mockDbUpdate.mockReset();

    // Default: unauthenticated
    mockGetSession.mockResolvedValue(null);

    // Default db mock for update
    mockDbUpdate.mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([mockUser]),
        })),
      })),
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

    vi.doMock("@repo/database", () => ({
      db: {
        query: {
          users: mockDbQueryUsers,
        },
        update: () => mockDbUpdate(),
      },
      users: mockUsersSchema,
    }));

    vi.doMock("drizzle-orm", () => ({
      eq: vi.fn((field, value) => ({ field, value })),
    }));

    vi.doMock("@repo/validations", () => ({
      createErrorResponse: (
        message: string,
        status: number,
        issues?: unknown
      ) => new Response(JSON.stringify({ error: message, issues }), { status }),
      createSuccessResponse: (data: unknown) =>
        new Response(JSON.stringify({ data }), { status: 200 }),
      updateUserSchema: {
        safeParse: (data: unknown) => {
          if (typeof data !== "object" || data === null) {
            return { success: false, error: { issues: [] } };
          }
          const obj = data as Record<string, unknown>;
          // Validate name if present
          if (obj.name !== undefined && typeof obj.name !== "string") {
            return {
              success: false,
              error: { issues: [{ message: "Name must be a string" }] },
            };
          }
          return { success: true, data };
        },
      },
    }));

    // Import the route handler with fresh mocks
    const routeModule = await import("@/app/api/v1/users/route");
    PATCH = routeModule.PATCH;
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const request = createMockRequest({
      method: "PATCH",
      url: "http://localhost:3000/api/v1/users",
      body: { name: "New Name" },
    });
    const response = await PATCH(request);
    const result = await parseJsonResponse(response);

    expectErrorResponse(result, 401, "Unauthorized");
  });

  it("updates user name successfully", async () => {
    const updatedUser = { ...mockUser, name: "Updated Name" };
    mockGetSession.mockResolvedValue(mockAuthSession);
    mockDbUpdate.mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([updatedUser]),
        })),
      })),
    });

    const request = createMockRequest({
      method: "PATCH",
      url: "http://localhost:3000/api/v1/users",
      body: { name: "Updated Name" },
    });
    const response = await PATCH(request);
    const { status, data } = await parseJsonResponse<{
      data: typeof mockUser;
    }>(response);

    expect(status).toBe(200);
    expect(data.data.name).toBe("Updated Name");
  });

  it("returns 404 when user not found during update", async () => {
    mockGetSession.mockResolvedValue(mockAuthSession);
    mockDbUpdate.mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([]),
        })),
      })),
    });

    const request = createMockRequest({
      method: "PATCH",
      url: "http://localhost:3000/api/v1/users",
      body: { name: "New Name" },
    });
    const response = await PATCH(request);
    const result = await parseJsonResponse(response);

    expectErrorResponse(result, 404, "User not found");
  });

  it("returns 400 for invalid input", async () => {
    mockGetSession.mockResolvedValue(mockAuthSession);

    vi.doMock("@repo/validations", () => ({
      createErrorResponse: (
        message: string,
        status: number,
        issues?: unknown
      ) => new Response(JSON.stringify({ error: message, issues }), { status }),
      createSuccessResponse: (data: unknown) =>
        new Response(JSON.stringify({ data }), { status: 200 }),
      updateUserSchema: {
        safeParse: () => ({
          success: false,
          error: { issues: [{ message: "Invalid input" }] },
        }),
      },
    }));

    const routeModule = await import("@/app/api/v1/users/route");
    const PATCH_FRESH = routeModule.PATCH;

    const request = createMockRequest({
      method: "PATCH",
      url: "http://localhost:3000/api/v1/users",
      body: { name: 123 }, // Invalid: should be string
    });
    const response = await PATCH_FRESH(request);
    const result = await parseJsonResponse(response);

    expectErrorResponse(result, 400);
  });
});
