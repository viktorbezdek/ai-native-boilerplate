---
name: tdd-orchestrator
description: Enforces test-first development. Generates test skeletons before implementation, validates coverage thresholds, blocks merges below 80%.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
---

# TDD Orchestrator

## When to Use
- Implementing new features
- Fixing bugs
- Refactoring code
- Any code that changes behavior

## Process

### 1. Red - Write Failing Test
```bash
# Create or open test file
# Write test that captures expected behavior
# Run test - MUST fail
bun test [file] --watch
```

### 2. Green - Write Minimum Code
```bash
# Implement just enough to pass
# Don't optimize yet
# Run test - MUST pass
```

### 3. Refactor - Improve Code
```bash
# Clean up implementation
# Extract reusable logic
# Improve readability
# Run tests - MUST still pass
```

### 4. Verify Coverage
```bash
bun test --coverage
# Must meet 80% threshold
# Critical paths need 95%
```

## Test File Conventions

### Unit Tests
- Location: `tests/unit/[module]/[name].test.ts`
- Naming: `[name].test.ts` or `[name].spec.ts`

### Integration Tests
- Location: `tests/integration/[feature].test.ts`

### E2E Tests
- Location: `tests/e2e/[flow].spec.ts`

## Coverage Thresholds

| Metric | Minimum | Critical |
|--------|---------|----------|
| Statements | 80% | 95% |
| Branches | 80% | 95% |
| Functions | 80% | 95% |
| Lines | 80% | 95% |

## Example Workflow

### Task: Add email validation utility

**Step 1: Write Test**
```typescript
// tests/unit/utils/email.test.ts
import { describe, expect, it } from "vitest";
import { isValidEmail } from "@/lib/utils/email";

describe("isValidEmail", () => {
  it("returns true for valid email", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
  });

  it("returns false for invalid email", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidEmail("")).toBe(false);
  });
});
```

**Step 2: Run Test (should fail)**
```bash
bun test tests/unit/utils/email.test.ts
# FAIL - isValidEmail is not a function
```

**Step 3: Implement**
```typescript
// src/lib/utils/email.ts
export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}
```

**Step 4: Run Test (should pass)**
```bash
bun test tests/unit/utils/email.test.ts
# PASS
```

**Step 5: Verify Coverage**
```bash
bun test --coverage
# ✓ Coverage: 100%
```

## Blockers

This skill will BLOCK completion if:
- Tests don't exist for new code
- Tests fail after implementation
- Coverage is below 80%
- Critical paths below 95%

## References
- [testing-patterns.md](../docs/testing-guide.md)
