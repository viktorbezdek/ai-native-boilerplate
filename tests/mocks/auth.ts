import { vi } from "vitest";
import { mockUser, mockSession } from "./db";

/**
 * Mock auth session
 */
export const mockAuthSession = {
  user: {
    id: mockUser.id,
    email: mockUser.email,
    name: mockUser.name,
    image: mockUser.image,
  },
  session: mockSession,
};

/**
 * Create mock auth function
 */
export function createMockAuth(authenticated = true) {
  return vi.fn().mockResolvedValue(
    authenticated ? mockAuthSession : null
  );
}

/**
 * Mock better-auth client
 */
export const mockAuthClient = {
  signIn: {
    email: vi.fn().mockResolvedValue({ data: mockAuthSession }),
    social: vi.fn().mockResolvedValue({ data: mockAuthSession }),
  },
  signUp: {
    email: vi.fn().mockResolvedValue({ data: mockAuthSession }),
  },
  signOut: vi.fn().mockResolvedValue(undefined),
  useSession: vi.fn().mockReturnValue({
    data: mockAuthSession,
    isPending: false,
    error: null,
  }),
  getSession: vi.fn().mockResolvedValue(mockAuthSession),
};

/**
 * Mock auth module
 */
export function mockAuthModule() {
  vi.mock("@/lib/auth", () => ({
    auth: createMockAuth(true),
    authClient: mockAuthClient,
  }));
}

/**
 * Mock unauthenticated state
 */
export function mockUnauthenticated() {
  vi.mock("@/lib/auth", () => ({
    auth: createMockAuth(false),
    authClient: {
      ...mockAuthClient,
      useSession: vi.fn().mockReturnValue({
        data: null,
        isPending: false,
        error: null,
      }),
    },
  }));
}

/**
 * Reset auth mocks
 */
export function resetAuthMocks() {
  Object.values(mockAuthClient.signIn).forEach((mock) => mock.mockClear());
  mockAuthClient.signUp.email.mockClear();
  mockAuthClient.signOut.mockClear();
  mockAuthClient.useSession.mockClear();
  mockAuthClient.getSession.mockClear();
}
