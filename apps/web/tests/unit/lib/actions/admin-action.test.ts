import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the auth module with inline mock function
vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

import { withAdminAction } from "@/lib/actions/admin-action";
// Import mocked module after vi.mock
import { getSession } from "@/lib/auth";

// Get the mocked function
const mockGetSession = vi.mocked(getSession);

describe("withAdminAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return unauthorized when no session exists", async () => {
    mockGetSession.mockResolvedValue(null);

    const action = withAdminAction<void, void>("test_action", async () => {
      return { success: true };
    });

    const result = await action();
    expect(result).toEqual({ success: false, error: "Unauthorized" });
  });

  it("should return unauthorized when session has no user", async () => {
    mockGetSession.mockResolvedValue({ session: {}, user: null } as never);

    const action = withAdminAction<void, void>("test_action", async () => {
      return { success: true };
    });

    const result = await action();
    expect(result).toEqual({ success: false, error: "Unauthorized" });
  });

  it("should return admin required error when user is not admin", async () => {
    mockGetSession.mockResolvedValue({
      session: {},
      user: { id: "user-123", role: "user" },
    } as never);

    const action = withAdminAction<void, void>("test_action", async () => {
      return { success: true };
    });

    const result = await action();
    expect(result).toEqual({ success: false, error: "Admin access required" });
  });

  it("should execute handler when user is admin", async () => {
    mockGetSession.mockResolvedValue({
      session: {},
      user: { id: "admin-123", role: "admin" },
    } as never);

    const handler = vi
      .fn()
      .mockResolvedValue({ success: true, data: "result" });
    const action = withAdminAction<string, void>("test_action", handler);

    const result = await action();

    expect(handler).toHaveBeenCalledWith({
      userId: "admin-123",
      input: undefined,
    });
    expect(result).toEqual({ success: true, data: "result" });
  });

  it("should pass input to handler", async () => {
    mockGetSession.mockResolvedValue({
      session: {},
      user: { id: "admin-123", role: "admin" },
    } as never);

    const handler = vi.fn().mockResolvedValue({ success: true });
    const action = withAdminAction<void, { name: string }>(
      "test_action",
      handler
    );

    await action({ name: "test" });

    expect(handler).toHaveBeenCalledWith({
      userId: "admin-123",
      input: { name: "test" },
    });
  });

  it("should catch errors and return generic error message", async () => {
    mockGetSession.mockResolvedValue({
      session: {},
      user: { id: "admin-123", role: "admin" },
    } as never);

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const action = withAdminAction<void, void>("test_action", async () => {
      throw new Error("Something went wrong");
    });

    const result = await action();

    expect(result).toEqual({ success: false, error: "test_action failed" });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "test_action error:",
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it("should preserve error from handler ActionResult", async () => {
    mockGetSession.mockResolvedValue({
      session: {},
      user: { id: "admin-123", role: "admin" },
    } as never);

    const action = withAdminAction<void, void>("test_action", async () => {
      return { success: false, error: "Custom validation error" };
    });

    const result = await action();
    expect(result).toEqual({
      success: false,
      error: "Custom validation error",
    });
  });
});
