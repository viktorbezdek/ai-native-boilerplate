export * from "./constants";
export * from "./render";

import { expect, vi } from "vitest";

/**
 * Create a spy on console methods for testing
 */
export function spyOnConsole() {
  const consoleSpy = {
    log: vi.spyOn(console, "log").mockImplementation(() => undefined),
    error: vi.spyOn(console, "error").mockImplementation(() => undefined),
    warn: vi.spyOn(console, "warn").mockImplementation(() => undefined),
    info: vi.spyOn(console, "info").mockImplementation(() => undefined),
  };

  return {
    ...consoleSpy,
    restore: () => {
      consoleSpy.log.mockRestore();
      consoleSpy.error.mockRestore();
      consoleSpy.warn.mockRestore();
      consoleSpy.info.mockRestore();
    },
    clear: () => {
      consoleSpy.log.mockClear();
      consoleSpy.error.mockClear();
      consoleSpy.warn.mockClear();
      consoleSpy.info.mockClear();
    },
  };
}

/**
 * Create a mock Date for testing time-sensitive code
 */
export function mockDate(date: Date | string | number) {
  const mockDateObj = new Date(date);
  vi.useFakeTimers();
  vi.setSystemTime(mockDateObj);

  return {
    restore: () => vi.useRealTimers(),
    advance: (ms: number) => vi.advanceTimersByTime(ms),
    advanceToNextTimer: () => vi.advanceTimersToNextTimer(),
  };
}

/**
 * Generate a random test ID
 */
export function generateTestId(prefix = "test"): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a mock fetch response
 */
export function createMockFetchResponse<T>(
  data: T,
  options: {
    status?: number;
    ok?: boolean;
    headers?: Record<string, string>;
  } = {}
): Response {
  const { status = 200, ok = true, headers = {} } = options;

  return {
    ok,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: new Headers(headers),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    formData: () => Promise.resolve(new FormData()),
    clone: () => createMockFetchResponse(data, options),
  } as Response;
}

/**
 * Mock global fetch
 */
export function mockFetch(responses: Map<string, Response> | Response) {
  const originalFetch = global.fetch;

  if (responses instanceof Response) {
    (global.fetch as unknown) = vi.fn().mockResolvedValue(responses);
  } else {
    (global.fetch as unknown) = vi.fn().mockImplementation((url: string) => {
      const response = responses.get(url);
      if (response) {
        return Promise.resolve(response);
      }
      return Promise.reject(new Error(`No mock for ${url}`));
    });
  }

  return {
    restore: () => {
      global.fetch = originalFetch;
    },
    mock: global.fetch as unknown as ReturnType<typeof vi.fn>,
  };
}

/**
 * Async test helper that ensures a promise resolves
 */
export async function expectToResolve<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (e) {
    throw new Error(`Expected promise to resolve, but it rejected with: ${e}`);
  }
}

/**
 * Async test helper that ensures a promise rejects
 */
export async function expectToReject(
  promise: Promise<unknown>,
  expectedError?: string | RegExp
): Promise<Error> {
  let error: unknown;

  try {
    await promise;
  } catch (e) {
    error = e;
  }

  if (!error) {
    throw new Error("Expected promise to reject, but it resolved");
  }

  if (expectedError) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (typeof expectedError === "string") {
      expect(errorMessage).toContain(expectedError);
    } else {
      expect(errorMessage).toMatch(expectedError);
    }
  }

  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Wait for all promises and microtasks to settle
 */
export async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
