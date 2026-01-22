# Testing Guide

## Test Structure

```
apps/web/tests/
├── e2e/                    # Playwright E2E tests
│   ├── auth.spec.ts
│   └── home.spec.ts
├── integration/            # API route tests
│   ├── api/
│   │   ├── billing.test.ts
│   │   ├── checkout.test.ts
│   │   ├── health.test.ts
│   │   ├── projects.test.ts
│   │   └── users.test.ts
│   ├── stripe/
│   │   ├── checkout.test.ts
│   │   └── webhooks.test.ts
│   └── helpers.ts
├── mocks/
│   ├── auth.ts
│   ├── db.ts
│   ├── external.ts
│   └── index.ts
└── unit/
    └── components/
```

## Running Tests

```bash
# Unit + integration tests
bun test

# With coverage
bun test:coverage

# E2E tests
bun test:e2e

# Watch mode
bun test --watch
```

## Test Patterns

### Unit Tests

Test pure functions and components in isolation:

```typescript
import { describe, expect, it } from "vitest";
import { formatPrice } from "@/lib/utils";

describe("formatPrice", () => {
  it("formats USD correctly", () => {
    expect(formatPrice(1999, "usd")).toBe("$19.99");
  });

  it("handles zero amount", () => {
    expect(formatPrice(0, "usd")).toBe("$0.00");
  });
});
```

### Integration Tests

Test API routes with mocked dependencies:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockAuthSession } from "../../mocks";
import { createMockRequest, parseJsonResponse } from "../helpers";

// Mock at module level
const mockGetSession = vi.fn();

describe("POST /api/v1/projects", () => {
  let POST: (request: any) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    mockGetSession.mockReset();

    // Setup mocks
    vi.doMock("@/lib/auth", () => ({
      getSession: mockGetSession,
    }));

    // Import fresh module
    const routeModule = await import("@/app/api/v1/projects/route");
    POST = routeModule.POST;
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const request = createMockRequest({
      method: "POST",
      body: { name: "Test" },
    });
    const response = await POST(request);
    const { status } = await parseJsonResponse(response);

    expect(status).toBe(401);
  });
});
```

### E2E Tests

Test complete user flows with Playwright:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("user can sign in", async ({ page }) => {
    await page.goto("/sign-in");
    await page.fill('[name="email"]', "test@example.com");
    await page.fill('[name="password"]', "password123");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL("/dashboard");
  });
});
```

## Mocking

### Database Mocks

```typescript
// Mock database module
vi.mock("@repo/database", () => ({
  db: {
    query: {
      projects: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([mockProject]),
  },
  projects: mockProjectsSchema,
}));
```

### Auth Mocks

```typescript
// Mock auth session
export const mockAuthSession = {
  user: {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
  },
  session: {
    id: "session-123",
    expiresAt: new Date(Date.now() + 86400000),
  },
};

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn().mockResolvedValue(mockAuthSession),
}));
```

### External Service Mocks

```typescript
// Mock Stripe
export const mockStripe = {
  checkout: {
    sessions: {
      create: vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com" }),
    },
  },
  subscriptions: {
    retrieve: vi.fn().mockResolvedValue(mockSubscription),
  },
};

vi.mock("@repo/payments", () => ({
  stripe: mockStripe,
  createCheckoutSession: mockStripe.checkout.sessions.create,
}));
```

## Test Helpers

### Create Mock Request

```typescript
import { NextRequest } from "next/server";

export function createMockRequest(options: {
  method?: string;
  url?: string;
  body?: unknown;
  headers?: Record<string, string>;
  searchParams?: Record<string, string>;
}): NextRequest {
  const { method = "GET", url = "http://localhost:3000", body } = options;

  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}
```

### Parse Response

```typescript
export async function parseJsonResponse<T>(
  response: Response
): Promise<{ status: number; data: T }> {
  const data = await response.json();
  return { status: response.status, data };
}
```

### Assert Errors

```typescript
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
```

## Coverage Requirements

- **Minimum overall**: 80%
- **Critical paths**: 95%
  - Authentication
  - Payment processing
  - Data mutations

Generate coverage report:

```bash
bun test:coverage
```

## Best Practices

1. **Test behavior, not implementation**
   - Test what the function does, not how it does it
   - Avoid testing private methods directly

2. **One assertion per test (when possible)**
   - Makes failures easier to diagnose
   - Use `it` descriptions that explain the expectation

3. **Use meaningful test data**
   - Create mock data factories
   - Use realistic values

4. **Reset state between tests**
   - Clear mocks in `beforeEach`
   - Reset module cache when needed

5. **Avoid flaky tests**
   - Don't rely on timing
   - Mock external services
   - Use deterministic test data

6. **TDD approach**
   - Write failing test first
   - Implement minimum code to pass
   - Refactor while keeping tests green
