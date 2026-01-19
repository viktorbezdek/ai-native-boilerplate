# /implement - TDD Implementation

Implement a feature or task using test-driven development.

## Usage
```
/implement [task description or task ID from plan]
```

## Process

1. **Understand Requirements**
   - Read task specification
   - Review related code
   - Identify edge cases

2. **Write Failing Tests First**
   - Create test file if needed
   - Write tests for happy path
   - Write tests for edge cases
   - Write tests for error handling
   - **Run tests - verify they FAIL**

3. **Implement Minimum Code**
   - Write just enough to pass tests
   - Focus on correctness, not optimization
   - **Run tests - verify they PASS**

4. **Refactor**
   - Improve code quality
   - Extract reusable logic
   - Add documentation
   - **Run tests - verify still passing**

5. **Verify Coverage**
   ```bash
   bun test --coverage
   ```
   - Must meet 80% threshold
   - Critical paths need 95%

6. **Final Checks**
   ```bash
   bun lint
   bun typecheck
   ```

## Example

```
/implement Create UserAvatar component with fallback
```

### Step 1: Write Tests
```typescript
// tests/unit/components/user-avatar.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UserAvatar } from "@/components/features/user-avatar";

describe("UserAvatar", () => {
  it("renders image when src provided", () => {
    render(<UserAvatar src="/avatar.jpg" name="John" />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "/avatar.jpg");
  });

  it("renders fallback when no src", () => {
    render(<UserAvatar name="John Doe" />);
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("generates correct initials", () => {
    render(<UserAvatar name="Alice Bob Charlie" />);
    expect(screen.getByText("AC")).toBeInTheDocument();
  });
});
```

### Step 2: Run Tests (should fail)
```bash
bun test tests/unit/components/user-avatar.test.tsx
# Expected: FAIL - component doesn't exist
```

### Step 3: Implement
```typescript
// src/components/features/user-avatar.tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui";

interface UserAvatarProps {
  src?: string | null;
  name: string;
  className?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserAvatar({ src, name, className }: UserAvatarProps) {
  return (
    <Avatar className={className}>
      {src && <AvatarImage src={src} alt={name} />}
      <AvatarFallback>{getInitials(name)}</AvatarFallback>
    </Avatar>
  );
}
```

### Step 4: Run Tests (should pass)
```bash
bun test tests/unit/components/user-avatar.test.tsx
# Expected: PASS
```

### Step 5: Verify Coverage
```bash
bun test --coverage
# Verify 80%+ coverage
```

## Output Format
After implementation, provide:
- Files created/modified
- Test results summary
- Coverage report
- Any notes or follow-up items
