import { NextRequest } from "next/server";
import { vi } from "vitest";
import { mockAuthSession } from "../mocks/auth";

/**
 * Create a mock NextRequest
 */
export function createMockRequest(
  options: {
    method?: string;
    url?: string;
    body?: unknown;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  } = {}
): NextRequest {
  const {
    method = "GET",
    url = "http://localhost:3000/api/test",
    body,
    headers = {},
    searchParams = {},
  } = options;

  const urlWithParams = new URL(url);
  Object.entries(searchParams).forEach(([key, value]) => {
    urlWithParams.searchParams.set(key, value);
  });

  const request = new NextRequest(urlWithParams, {
    method,
    headers: new Headers({
      "Content-Type": "application/json",
      ...headers,
    }),
    body: body ? JSON.stringify(body) : undefined,
  });

  return request;
}

/**
 * Parse JSON response from API handler
 */
export async function parseJsonResponse<T>(
  response: Response
): Promise<{ status: number; data: T }> {
  const data = await response.json();
  return { status: response.status, data };
}

/**
 * Mock authenticated session for API tests
 */
export function mockApiAuth(authenticated = true) {
  vi.mock("@/lib/auth", () => ({
    auth: vi.fn().mockResolvedValue(authenticated ? mockAuthSession : null),
  }));
}

/**
 * Reset API auth mock
 */
export function resetApiAuth() {
  vi.resetModules();
}

/**
 * Test helper for asserting error responses
 */
export function expectErrorResponse(
  response: { status: number; data: unknown },
  expectedStatus: number,
  expectedMessage?: string
) {
  expect(response.status).toBe(expectedStatus);
  expect(response.data).toHaveProperty("error");
  if (expectedMessage) {
    expect((response.data as { error: string }).error).toBe(expectedMessage);
  }
}

/**
 * Test helper for asserting success responses
 */
export function expectSuccessResponse(
  response: { status: number; data: unknown },
  expectedStatus = 200
) {
  expect(response.status).toBe(expectedStatus);
  expect(response.data).not.toHaveProperty("error");
}
