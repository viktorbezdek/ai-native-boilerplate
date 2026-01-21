---
name: test-amplifier
description: Write effective unit, integration, and E2E tests using Vitest and Playwright. Includes mutation testing for test quality validation. Use when writing tests, improving coverage, or debugging test failures.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
---

# Test Amplifier

## Purpose
Create comprehensive, maintainable tests that verify functionality and prevent regressions.

## Technology Stack
- **Unit/Integration**: Vitest
- **E2E**: Playwright
- **Mocking**: MSW (Mock Service Worker)
- **Coverage**: v8 (built into Vitest)

## Test Organization

### Directory Structure
```
tests/
├── unit/           # Pure function tests
│   └── lib/        # Mirror src/lib structure
├── integration/    # Component + API tests
│   └── api/        # API route tests
├── e2e/            # Full user flow tests
│   └── auth/       # Auth flow tests
├── fixtures/       # Test data
├── mocks/          # Mock implementations
└── setup.ts        # Global test setup
```

### Naming Convention
```
[file-name].test.ts    # Unit tests
[file-name].spec.ts    # E2E tests
```

## Unit Test Pattern

```typescript
// tests/unit/lib/utils.test.ts
import { describe, it, expect, vi } from 'vitest';
import { formatCurrency, calculateTax } from '@/lib/utils';

describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
  });

  it('handles zero', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
  });

  it('handles negative values', () => {
    expect(formatCurrency(-50, 'USD')).toBe('-$50.00');
  });
});

describe('calculateTax', () => {
  it('calculates correct tax for given rate', () => {
    expect(calculateTax(100, 0.08)).toBe(8);
  });

  it('rounds to 2 decimal places', () => {
    expect(calculateTax(99.99, 0.0825)).toBe(8.25);
  });
});
```

## Integration Test Pattern

```typescript
// tests/integration/api/users.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, cleanupTestContext } from '@/tests/helpers';

describe('GET /api/v1/users', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext();
    await ctx.seedUsers(5);
  });

  afterAll(async () => {
    await cleanupTestContext(ctx);
  });

  it('returns paginated users', async () => {
    const response = await ctx.request('/api/v1/users?limit=2');
    
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta.limit).toBe(2);
  });

  it('requires authentication', async () => {
    const response = await ctx.request('/api/v1/users', {
      authenticated: false,
    });
    
    expect(response.status).toBe(401);
  });
});
```

## E2E Test Pattern

```typescript
// tests/e2e/auth/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[name="email"]', 'wrong@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('[role="alert"]')).toContainText(
      'Invalid credentials'
    );
    await expect(page).toHaveURL('/login');
  });

  test('validates required fields', async ({ page }) => {
    await page.goto('/login');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('[name="email"]:invalid')).toBeVisible();
  });
});
```

## Mocking Patterns

### API Mocking with MSW
```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/v1/users', () => {
    return HttpResponse.json({
      data: [
        { id: '1', name: 'Test User' },
      ],
    });
  }),
  
  http.post('/api/v1/users', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      { data: { id: '2', ...body } },
      { status: 201 }
    );
  }),
];
```

### Module Mocking
```typescript
// Mock external service
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));
```

## Test Data Factories

```typescript
// tests/fixtures/factories.ts
import { faker } from '@faker-js/faker';

export function createUser(overrides = {}) {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    createdAt: faker.date.past(),
    ...overrides,
  };
}

export function createUsers(count: number, overrides = {}) {
  return Array.from({ length: count }, () => createUser(overrides));
}
```

## Coverage Requirements

### Thresholds
```typescript
// vitest.config.ts
coverage: {
  thresholds: {
    statements: 80,
    branches: 80,
    functions: 80,
    lines: 80,
  },
}
```

### Priority Areas
1. **Business logic** - 100% coverage
2. **API routes** - 90% coverage
3. **UI components** - 80% coverage
4. **Utilities** - 100% coverage

## Checklist
- [ ] Tests are isolated (no shared state)
- [ ] Tests are deterministic (no flaky tests)
- [ ] Tests have meaningful assertions
- [ ] Error cases are tested
- [ ] Edge cases are covered
- [ ] Mocks are minimal and realistic
- [ ] Test names describe behavior

## Output Format
```markdown
## Test Suite: [Name]

### Coverage
- Statements: X%
- Branches: X%
- Functions: X%

### Test Cases
| Test | Description | Status |
|------|-------------|--------|

### Gaps Identified
- [Untested scenario]
```
