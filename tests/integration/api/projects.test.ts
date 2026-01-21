/**
 * Integration tests for the Projects API
 *
 * These tests verify the API route handlers work correctly with mocked
 * authentication and database.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockAuthSession, mockProject } from "../../mocks";
import {
  createMockRequest,
  expectErrorResponse,
  parseJsonResponse,
} from "../helpers";

// Create mock functions at module level that will be shared
const mockGetSession = vi.fn();
const mockDbQuery = {
  projects: {
    findMany: vi.fn(),
  },
};
const mockDbSelect = vi.fn();
const mockDbInsert = vi.fn();

describe("GET /api/v1/projects", () => {
  let GET: (request: Request) => Promise<Response>;

  beforeEach(async () => {
    // Reset module cache
    vi.resetModules();

    // Reset all mocks
    mockGetSession.mockReset();
    mockDbQuery.projects.findMany.mockReset();
    mockDbSelect.mockReset();
    mockDbInsert.mockReset();

    // Default: unauthenticated
    mockGetSession.mockResolvedValue(null);

    // Default db mocks
    mockDbQuery.projects.findMany.mockResolvedValue([]);
    mockDbSelect.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      })),
    });

    // Set up mocks using vi.doMock (not hoisted)
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

    vi.doMock("@/lib/utils/csrf", () => ({
      validateCsrf: vi.fn(() => Promise.resolve({ valid: true })),
      validateCsrfToken: vi.fn(() => Promise.resolve({ valid: true })),
      generateCsrfToken: vi.fn(() => "mock-csrf-token"),
      CsrfProtection: vi.fn(() => null),
    }));

    // Mock auth module - getSession returns our mock
    vi.doMock("@/lib/auth", () => ({
      auth: {},
      getSession: mockGetSession,
    }));

    // Mock database module
    vi.doMock("@/lib/db", () => ({
      db: {
        query: mockDbQuery,
        select: (...args: unknown[]) => mockDbSelect(...args),
        insert: (...args: unknown[]) => mockDbInsert(...args),
      },
    }));

    // Import the route handler with fresh mocks
    const routeModule = await import("@/app/api/v1/projects/route");
    GET = routeModule.GET;
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const request = createMockRequest({
      url: "http://localhost:3000/api/v1/projects",
    });
    const response = await GET(request);
    const result = await parseJsonResponse(response);

    expectErrorResponse(result, 401, "Unauthorized");
  });

  it("returns paginated projects for authenticated user", async () => {
    mockGetSession.mockResolvedValue(mockAuthSession);
    mockDbQuery.projects.findMany.mockResolvedValue([mockProject]);
    mockDbSelect.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([{ count: 1 }]),
      })),
    });

    const request = createMockRequest({
      url: "http://localhost:3000/api/v1/projects",
    });
    const response = await GET(request);
    const { status, data } = await parseJsonResponse<{
      data: (typeof mockProject)[];
      meta: { total: number; page: number; limit: number };
    }>(response);

    expect(status).toBe(200);
    expect(data.data).toHaveLength(1);
    expect(data.data[0]?.id).toBe(mockProject.id);
    expect(data.meta.total).toBe(1);
  });

  it("respects pagination parameters", async () => {
    mockGetSession.mockResolvedValue(mockAuthSession);
    mockDbQuery.projects.findMany.mockResolvedValue([]);
    mockDbSelect.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([{ count: 25 }]),
      })),
    });

    const request = createMockRequest({
      url: "http://localhost:3000/api/v1/projects",
      searchParams: { page: "2", limit: "5" },
    });
    const response = await GET(request);
    const { status } = await parseJsonResponse<{
      data: unknown[];
      meta: { page: number; limit: number };
    }>(response);

    expect(status).toBe(200);
    expect(mockDbQuery.projects.findMany).toHaveBeenCalled();
  });
});

describe("POST /api/v1/projects", () => {
  let POST: (request: Request) => Promise<Response>;

  beforeEach(async () => {
    // Reset module cache
    vi.resetModules();

    // Reset all mocks
    mockGetSession.mockReset();
    mockDbQuery.projects.findMany.mockReset();
    mockDbSelect.mockReset();
    mockDbInsert.mockReset();

    // Default: unauthenticated
    mockGetSession.mockResolvedValue(null);

    // Default db mocks
    mockDbInsert.mockReturnValue({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([mockProject]),
      })),
    });

    // Set up mocks using vi.doMock (not hoisted)
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

    vi.doMock("@/lib/utils/csrf", () => ({
      validateCsrf: vi.fn(() => Promise.resolve({ valid: true })),
      validateCsrfToken: vi.fn(() => Promise.resolve({ valid: true })),
      generateCsrfToken: vi.fn(() => "mock-csrf-token"),
      CsrfProtection: vi.fn(() => null),
    }));

    // Mock auth module - getSession returns our mock
    vi.doMock("@/lib/auth", () => ({
      auth: {},
      getSession: mockGetSession,
    }));

    // Mock database module
    vi.doMock("@/lib/db", () => ({
      db: {
        query: mockDbQuery,
        select: (...args: unknown[]) => mockDbSelect(...args),
        insert: (...args: unknown[]) => mockDbInsert(...args),
      },
    }));

    // Import the route handler with fresh mocks
    const routeModule = await import("@/app/api/v1/projects/route");
    POST = routeModule.POST;
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const request = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/v1/projects",
      body: { name: "Test" },
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expectErrorResponse(result, 401, "Unauthorized");
  });

  it("creates a project with valid data", async () => {
    mockGetSession.mockResolvedValue(mockAuthSession);

    const request = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/v1/projects",
      body: { name: "New Project", description: "A test project" },
    });
    const response = await POST(request);
    const { status, data } = await parseJsonResponse<{
      data: typeof mockProject;
    }>(response);

    expect(status).toBe(201);
    expect(data.data.id).toBe(mockProject.id);
  });

  it("returns 400 for invalid input", async () => {
    mockGetSession.mockResolvedValue(mockAuthSession);

    const request = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/v1/projects",
      body: { name: "" }, // Invalid: empty name
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expectErrorResponse(result, 400);
  });

  it("returns 400 when name is missing", async () => {
    mockGetSession.mockResolvedValue(mockAuthSession);

    const request = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/v1/projects",
      body: { description: "No name provided" },
    });
    const response = await POST(request);
    const result = await parseJsonResponse(response);

    expectErrorResponse(result, 400);
  });
});
