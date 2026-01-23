/**
 * Integration tests for Auth API and utilities
 *
 * Tests the auth route handler and mock utilities.
 * Note: Better Auth handles the actual auth logic - these tests verify
 * our integration points and mock utilities work correctly.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMockAuth,
  createMockGetSession,
  mockAuthClient,
  mockAuthSession,
  resetAuthMocks,
} from "../../mocks";
import { mockUser } from "../../mocks/db";

describe("Auth Mock Utilities", () => {
  describe("mockAuthSession", () => {
    it("has required user properties", () => {
      expect(mockAuthSession).toHaveProperty("user");
      expect(mockAuthSession.user).toHaveProperty("id");
      expect(mockAuthSession.user).toHaveProperty("email");
      expect(mockAuthSession.user).toHaveProperty("name");
      expect(mockAuthSession.user).toHaveProperty("image");
    });

    it("has required session properties", () => {
      expect(mockAuthSession).toHaveProperty("session");
      expect(mockAuthSession.session).toHaveProperty("id");
      expect(mockAuthSession.session).toHaveProperty("userId");
      expect(mockAuthSession.session).toHaveProperty("expiresAt");
    });

    it("user id matches session userId", () => {
      expect(mockAuthSession.user.id).toBe(mockAuthSession.session.userId);
    });

    it("session expiry is in the future", () => {
      expect(mockAuthSession.session.expiresAt.getTime()).toBeGreaterThan(
        Date.now()
      );
    });
  });

  describe("mockUser", () => {
    it("has all expected fields", () => {
      expect(mockUser).toHaveProperty("id");
      expect(mockUser).toHaveProperty("email");
      expect(mockUser).toHaveProperty("name");
      expect(mockUser).toHaveProperty("emailVerified");
      expect(mockUser).toHaveProperty("createdAt");
      expect(mockUser).toHaveProperty("updatedAt");
    });

    it("has valid email format", () => {
      expect(mockUser.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it("emailVerified is boolean", () => {
      expect(typeof mockUser.emailVerified).toBe("boolean");
    });

    it("timestamps are Date objects", () => {
      expect(mockUser.createdAt).toBeInstanceOf(Date);
      expect(mockUser.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("createMockAuth", () => {
    it("returns authenticated session by default", async () => {
      const mockAuth = createMockAuth();
      const result = await mockAuth();

      expect(result).toEqual(mockAuthSession);
    });

    it("returns authenticated session when true passed", async () => {
      const mockAuth = createMockAuth(true);
      const result = await mockAuth();

      expect(result).toEqual(mockAuthSession);
    });

    it("returns null when false passed", async () => {
      const mockAuth = createMockAuth(false);
      const result = await mockAuth();

      expect(result).toBeNull();
    });

    it("returns a vitest mock function", () => {
      const mockAuth = createMockAuth();
      expect(vi.isMockFunction(mockAuth)).toBe(true);
    });
  });

  describe("createMockGetSession", () => {
    it("returns authenticated session by default", async () => {
      const mockGetSession = createMockGetSession();
      const result = await mockGetSession();

      expect(result).toEqual(mockAuthSession);
    });

    it("returns null when unauthenticated", async () => {
      const mockGetSession = createMockGetSession(false);
      const result = await mockGetSession();

      expect(result).toBeNull();
    });
  });

  describe("mockAuthClient", () => {
    beforeEach(() => {
      resetAuthMocks();
    });

    it("has signIn.email method", async () => {
      const result = await mockAuthClient.signIn.email({
        email: "test@example.com",
        password: "password123",
      });

      expect(result.data).toEqual(mockAuthSession);
    });

    it("has signIn.social method", async () => {
      const result = await mockAuthClient.signIn.social({
        provider: "github",
      });

      expect(result.data).toEqual(mockAuthSession);
    });

    it("has signUp.email method", async () => {
      const result = await mockAuthClient.signUp.email({
        email: "new@example.com",
        password: "password123",
        name: "New User",
      });

      expect(result.data).toEqual(mockAuthSession);
    });

    it("has signOut method", async () => {
      await expect(mockAuthClient.signOut()).resolves.toBeUndefined();
    });

    it("has getSession method", async () => {
      const session = await mockAuthClient.getSession();
      expect(session).toEqual(mockAuthSession);
    });

    it("has useSession hook that returns session data", () => {
      const sessionData = mockAuthClient.useSession();

      expect(sessionData).toEqual({
        data: mockAuthSession,
        isPending: false,
        error: null,
      });
    });
  });

  describe("resetAuthMocks", () => {
    it("clears all mock call counts", async () => {
      // Make some calls
      await mockAuthClient.signIn.email({});
      await mockAuthClient.signOut();
      mockAuthClient.useSession();

      // Verify calls were made
      expect(mockAuthClient.signIn.email).toHaveBeenCalled();
      expect(mockAuthClient.signOut).toHaveBeenCalled();
      expect(mockAuthClient.useSession).toHaveBeenCalled();

      // Reset
      resetAuthMocks();

      // Verify calls were cleared
      expect(mockAuthClient.signIn.email).not.toHaveBeenCalled();
      expect(mockAuthClient.signOut).not.toHaveBeenCalled();
      expect(mockAuthClient.useSession).not.toHaveBeenCalled();
    });
  });
});

describe("Auth Route Handler", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("exports GET and POST handlers", async () => {
    const mockHandler = vi.fn().mockResolvedValue(new Response("OK"));

    vi.doMock("better-auth/next-js", () => ({
      toNextJsHandler: vi.fn(() => ({
        GET: mockHandler,
        POST: mockHandler,
      })),
    }));

    vi.doMock("@/lib/auth", () => ({
      auth: {},
    }));

    const routeModule = await import("@/app/api/auth/[...all]/route");

    expect(routeModule.GET).toBeDefined();
    expect(routeModule.POST).toBeDefined();
    expect(typeof routeModule.GET).toBe("function");
    expect(typeof routeModule.POST).toBe("function");
  });

  it("GET handler delegates to Better Auth", async () => {
    const mockGetHandler = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    vi.doMock("better-auth/next-js", () => ({
      toNextJsHandler: vi.fn(() => ({
        GET: mockGetHandler,
        POST: vi.fn(),
      })),
    }));

    vi.doMock("@/lib/auth", () => ({
      auth: {},
    }));

    const routeModule = await import("@/app/api/auth/[...all]/route");

    const request = new Request("http://localhost:3000/api/auth/session", {
      method: "GET",
    });

    const response = await routeModule.GET(request);

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);
    expect(mockGetHandler).toHaveBeenCalledWith(request);
  });

  it("POST handler delegates to Better Auth", async () => {
    const mockPostHandler = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    vi.doMock("better-auth/next-js", () => ({
      toNextJsHandler: vi.fn(() => ({
        GET: vi.fn(),
        POST: mockPostHandler,
      })),
    }));

    vi.doMock("@/lib/auth", () => ({
      auth: {},
    }));

    const routeModule = await import("@/app/api/auth/[...all]/route");

    const request = new Request(
      "http://localhost:3000/api/auth/sign-in/email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
        }),
      }
    );

    const response = await routeModule.POST(request);

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);
    expect(mockPostHandler).toHaveBeenCalledWith(request);
  });

  it("GET handler returns Response object", async () => {
    const mockResponse = new Response(
      JSON.stringify({ session: mockAuthSession }),
      { status: 200 }
    );
    const mockGetHandler = vi.fn().mockResolvedValue(mockResponse);

    vi.doMock("better-auth/next-js", () => ({
      toNextJsHandler: vi.fn(() => ({
        GET: mockGetHandler,
        POST: vi.fn(),
      })),
    }));

    vi.doMock("@/lib/auth", () => ({
      auth: {},
    }));

    const routeModule = await import("@/app/api/auth/[...all]/route");

    const request = new Request("http://localhost:3000/api/auth/session");
    const response = await routeModule.GET(request);
    const data = await response.json();

    expect(data).toHaveProperty("session");
  });

  it("POST handler handles sign-in request", async () => {
    const mockPostHandler = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          user: mockAuthSession.user,
          session: mockAuthSession.session,
        }),
        { status: 200 }
      )
    );

    vi.doMock("better-auth/next-js", () => ({
      toNextJsHandler: vi.fn(() => ({
        GET: vi.fn(),
        POST: mockPostHandler,
      })),
    }));

    vi.doMock("@/lib/auth", () => ({
      auth: {},
    }));

    const routeModule = await import("@/app/api/auth/[...all]/route");

    const request = new Request(
      "http://localhost:3000/api/auth/sign-in/email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: mockUser.email,
          password: "securePassword123",
        }),
      }
    );

    const response = await routeModule.POST(request);
    const data = await response.json();

    expect(data).toHaveProperty("user");
    expect(data).toHaveProperty("session");
  });

  it("POST handler handles sign-up request", async () => {
    const newUser = {
      id: "new-user-123",
      email: "newuser@example.com",
      name: "New User",
    };

    const mockPostHandler = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          user: newUser,
          session: { id: "new-session-123", userId: newUser.id },
        }),
        { status: 201 }
      )
    );

    vi.doMock("better-auth/next-js", () => ({
      toNextJsHandler: vi.fn(() => ({
        GET: vi.fn(),
        POST: mockPostHandler,
      })),
    }));

    vi.doMock("@/lib/auth", () => ({
      auth: {},
    }));

    const routeModule = await import("@/app/api/auth/[...all]/route");

    const request = new Request(
      "http://localhost:3000/api/auth/sign-up/email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newUser.email,
          password: "securePassword123",
          name: newUser.name,
        }),
      }
    );

    const response = await routeModule.POST(request);

    expect(response.status).toBe(201);
  });

  it("POST handler handles sign-out request", async () => {
    const mockPostHandler = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );

    vi.doMock("better-auth/next-js", () => ({
      toNextJsHandler: vi.fn(() => ({
        GET: vi.fn(),
        POST: mockPostHandler,
      })),
    }));

    vi.doMock("@/lib/auth", () => ({
      auth: {},
    }));

    const routeModule = await import("@/app/api/auth/[...all]/route");

    const request = new Request("http://localhost:3000/api/auth/sign-out", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: "better-auth.session_token=test_session_123",
      },
    });

    const response = await routeModule.POST(request);
    const data = await response.json();

    expect(data.success).toBe(true);
  });

  it("handler returns error for invalid routes", async () => {
    const mockGetHandler = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
      );

    vi.doMock("better-auth/next-js", () => ({
      toNextJsHandler: vi.fn(() => ({
        GET: mockGetHandler,
        POST: vi.fn(),
      })),
    }));

    vi.doMock("@/lib/auth", () => ({
      auth: {},
    }));

    const routeModule = await import("@/app/api/auth/[...all]/route");

    const request = new Request("http://localhost:3000/api/auth/invalid-route");
    const response = await routeModule.GET(request);

    expect(response.status).toBe(404);
  });
});

describe("Auth Session Data Structure", () => {
  it("session has expected expiry duration (7 days)", () => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // mockSession.expiresAt should be roughly 7 days from when it was created
    const expiresAt = mockAuthSession.session.expiresAt;
    const diffInDays =
      (expiresAt.getTime() - mockAuthSession.session.createdAt.getTime()) /
      (24 * 60 * 60 * 1000);

    expect(diffInDays).toBeCloseTo(7, 0);
  });

  it("user email matches between user and session data", () => {
    expect(mockAuthSession.user.email).toBe(mockUser.email);
  });

  it("session contains IP and user agent for security", () => {
    expect(mockAuthSession.session).toHaveProperty("ipAddress");
    expect(mockAuthSession.session).toHaveProperty("userAgent");
  });
});
