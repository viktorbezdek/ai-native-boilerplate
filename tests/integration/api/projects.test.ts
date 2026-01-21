import { GET, POST } from "@/app/api/v1/projects/route";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockAuthSession, mockProject } from "../../mocks";
import {
  createMockRequest,
  expectErrorResponse,
  parseJsonResponse,
} from "../helpers";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db/queries", () => ({
  getProjectsForUser: vi.fn(),
  createProject: vi.fn(),
}));

// Import mocked modules
import { auth } from "@/lib/auth";
import { createProject, getProjectsForUser } from "@/lib/db/queries";

describe("GET /api/v1/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const request = createMockRequest({
      url: "http://localhost:3000/api/v1/projects",
    });
    const response = await GET(request);
    const result = await parseJsonResponse(response);

    expectErrorResponse(result, 401, "Unauthorized");
  });

  it("returns paginated projects for authenticated user", async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSession);
    (getProjectsForUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      projects: [mockProject],
      total: 1,
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
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSession);
    (getProjectsForUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      projects: [],
      total: 25,
    });

    const request = createMockRequest({
      url: "http://localhost:3000/api/v1/projects",
      searchParams: { page: "2", limit: "5" },
    });
    const response = await GET(request);
    const { status, data } = await parseJsonResponse<{
      data: unknown[];
      meta: { page: number; limit: number };
    }>(response);

    expect(status).toBe(200);
    expect(getProjectsForUser).toHaveBeenCalledWith(
      mockAuthSession.user.id,
      expect.objectContaining({ page: 2, limit: 5 })
    );
  });
});

describe("POST /api/v1/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(null);

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
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSession);
    (createProject as ReturnType<typeof vi.fn>).mockResolvedValue(mockProject);

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
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSession);

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
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSession);

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
