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

import * as apiModule from "@/lib/api";
// Import the actual modules first
import * as authModule from "@/lib/auth";

// Create spies on the actual module exports
const mockGetSession = vi.spyOn(authModule, "getSession");
const mockApplyApiMiddleware = vi.spyOn(apiModule, "applyApiMiddleware");

// Use vi.hoisted for db mocks that need to be in mock factories
const { mockFindMany, mockSelect, mockInsert } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
}));

// Mock the db module
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      projects: {
        findMany: mockFindMany,
      },
    },
    select: mockSelect,
    insert: mockInsert,
  },
}));

vi.mock("@repo/database", () => ({
  projects: {
    userId: "userId",
    createdAt: "createdAt",
    id: "id",
    name: "name",
    description: "description",
    isPublic: "isPublic",
    updatedAt: "updatedAt",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ eq: [a, b] })),
  asc: vi.fn((a) => ({ asc: a })),
  desc: vi.fn((a) => ({ desc: a })),
  count: vi.fn(() => "count"),
  and: vi.fn((...args) => ({ and: args })),
}));

// Import route handlers
import { GET, POST } from "@/app/api/v1/projects/route";

describe("GET /api/v1/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: middleware passes
    mockApplyApiMiddleware.mockResolvedValue({
      success: true,
      headers: {},
    } as never);

    // Default: unauthenticated
    mockGetSession.mockResolvedValue(null as never);

    // Default db mocks
    mockFindMany.mockResolvedValue([]);
    mockSelect.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      })),
    });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null as never);

    const request = createMockRequest({
      url: "http://localhost:3000/api/v1/projects",
    });
    const response = await GET(request as never);
    const result = await parseJsonResponse(response);

    expectErrorResponse(result, 401, "Unauthorized");
  });

  it("returns paginated projects for authenticated user", async () => {
    mockGetSession.mockResolvedValue(mockAuthSession as never);
    mockFindMany.mockResolvedValue([mockProject]);
    mockSelect.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([{ count: 1 }]),
      })),
    });

    const request = createMockRequest({
      url: "http://localhost:3000/api/v1/projects",
    });
    const response = await GET(request as never);
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
    mockGetSession.mockResolvedValue(mockAuthSession as never);
    mockFindMany.mockResolvedValue([]);
    mockSelect.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([{ count: 25 }]),
      })),
    });

    const request = createMockRequest({
      url: "http://localhost:3000/api/v1/projects",
      searchParams: { page: "2", limit: "5" },
    });
    const response = await GET(request as never);
    const { status } = await parseJsonResponse<{
      data: unknown[];
      meta: { page: number; limit: number };
    }>(response);

    expect(status).toBe(200);
    expect(mockFindMany).toHaveBeenCalled();
  });
});

describe("POST /api/v1/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: middleware passes
    mockApplyApiMiddleware.mockResolvedValue({
      success: true,
      headers: {},
    } as never);

    // Default: unauthenticated
    mockGetSession.mockResolvedValue(null as never);

    // Default db mocks
    mockInsert.mockReturnValue({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([mockProject]),
      })),
    });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null as never);

    const request = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/v1/projects",
      body: { name: "Test" },
    });
    const response = await POST(request as never);
    const result = await parseJsonResponse(response);

    expectErrorResponse(result, 401, "Unauthorized");
  });

  it("creates a project with valid data", async () => {
    mockGetSession.mockResolvedValue(mockAuthSession as never);

    const request = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/v1/projects",
      body: { name: "New Project", description: "A test project" },
    });
    const response = await POST(request as never);
    const { status, data } = await parseJsonResponse<{
      data: typeof mockProject;
    }>(response);

    expect(status).toBe(201);
    expect(data.data.id).toBe(mockProject.id);
  });

  it("returns 400 for invalid input", async () => {
    mockGetSession.mockResolvedValue(mockAuthSession as never);

    const request = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/v1/projects",
      body: { name: "" }, // Invalid: empty name
    });
    const response = await POST(request as never);
    const result = await parseJsonResponse(response);

    expectErrorResponse(result, 400);
  });

  it("returns 400 when name is missing", async () => {
    mockGetSession.mockResolvedValue(mockAuthSession as never);

    const request = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/v1/projects",
      body: { description: "No name provided" },
    });
    const response = await POST(request as never);
    const result = await parseJsonResponse(response);

    expectErrorResponse(result, 400);
  });
});
