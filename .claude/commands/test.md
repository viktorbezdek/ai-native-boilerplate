# /test - Generate Tests

Generate comprehensive tests for specified code.

## Usage
```
/test [file path | component name | function name]
```

## Test Types

### Unit Tests (Vitest)
For isolated logic:
- Utility functions
- Hooks
- Components (with mocked dependencies)

### Integration Tests
For combined behavior:
- API routes
- Server actions
- Database queries

### E2E Tests (Playwright)
For user flows:
- Authentication
- Critical paths
- Full page interactions

## Process

1. **Analyze Code**
   - Identify public API
   - Map dependencies
   - List edge cases

2. **Generate Test Cases**
   - Happy path (normal operation)
   - Edge cases (boundaries, empty inputs)
   - Error cases (invalid inputs, failures)
   - Security cases (if applicable)

3. **Write Tests**
   - Use describe/it structure
   - One assertion per test when possible
   - Descriptive test names

4. **Verify Coverage**
   ```bash
   bun test --coverage [file]
   ```

## Test Patterns

### Component Test
```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders children correctly", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button")).toHaveTextContent("Click me");
  });

  it("calls onClick when clicked", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("is disabled when disabled prop is true", () => {
    render(<Button disabled>Click</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
```

### Server Action Test
```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";
import { updateProfile } from "@/server/actions/profile";

// Mock database
vi.mock("@/lib/db", () => ({
  db: {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "1", name: "Updated" }]),
        }),
      }),
    }),
  },
}));

describe("updateProfile", () => {
  it("updates user name", async () => {
    const result = await updateProfile({ name: "New Name" });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", async () => {
    const result = await updateProfile({ name: "" });
    expect(result.success).toBe(false);
  });
});
```

### E2E Test
```typescript
import { test, expect } from "@playwright/test";

test.describe("Login Flow", () => {
  test("user can sign in with valid credentials", async ({ page }) => {
    await page.goto("/sign-in");
    
    await page.fill('[name="email"]', "test@example.com");
    await page.fill('[name="password"]', "password123");
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByText("Welcome back")).toBeVisible();
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto("/sign-in");
    
    await page.fill('[name="email"]', "wrong@example.com");
    await page.fill('[name="password"]', "wrongpassword");
    await page.click('button[type="submit"]');
    
    await expect(page.getByText("Invalid credentials")).toBeVisible();
  });
});
```

## Output Format

```markdown
## Tests Generated: [Target]

### Files Created
- `tests/unit/[name].test.ts` (X tests)
- `tests/e2e/[name].spec.ts` (Y tests)

### Test Summary
| Type | Count | Coverage |
|------|-------|----------|
| Unit | X     | 85%      |
| E2E  | Y     | N/A      |

### Test Run
```
✓ [test name] (Xms)
✓ [test name] (Xms)
...
```

### Notes
- [Any edge cases not covered]
- [Suggestions for additional tests]
```
