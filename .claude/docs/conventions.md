# Code Conventions

## TypeScript

### Strict Mode

Strict mode is enabled. These are not allowed:
- `any` type (use `unknown` and narrow)
- Implicit `any` in function parameters
- Non-null assertions (`!`) without justification

### Type vs Interface

```typescript
// Use `type` for object shapes and unions
type User = {
  id: string;
  name: string;
  email: string;
};

type Result<T> = { success: true; data: T } | { success: false; error: Error };

// Use `interface` for extensible contracts
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  create(data: Omit<T, "id">): Promise<T>;
}
```

### Explicit Return Types

Public functions must have explicit return types:

```typescript
// Good
export function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency })
    .format(amount / 100);
}

// Bad - no return type
export function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency })
    .format(amount / 100);
}
```

## React / Next.js

### Server Components by Default

Components are Server Components unless they need interactivity:

```typescript
// Server Component (default) - no directive needed
export function UserProfile({ userId }: { userId: string }) {
  const user = await getUserById(userId);
  return <div>{user.name}</div>;
}

// Client Component - needs interactivity
"use client";

import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

### Named Exports

Always use named exports for components:

```typescript
// Good
export function Button({ children }: { children: React.ReactNode }) {
  return <button>{children}</button>;
}

// Bad
export default function Button({ children }: { children: React.ReactNode }) {
  return <button>{children}</button>;
}
```

### Component Organization

Colocate components with their routes when possible:

```
app/
├── (dashboard)/
│   ├── dashboard/
│   │   ├── page.tsx
│   │   ├── loading.tsx
│   │   └── _components/
│   │       ├── stats-card.tsx
│   │       └── recent-activity.tsx
```

Shared components go in `src/components/`:

```
components/
├── ui/           # shadcn/ui primitives
│   ├── button.tsx
│   └── card.tsx
└── features/     # Feature-specific shared components
    ├── user-menu.tsx
    └── nav-header.tsx
```

## Database

### Query Location

All database queries live in `packages/database/src/queries/`:

```typescript
// packages/database/src/queries/users.ts
import { eq } from "drizzle-orm";
import { db } from "../index";
import { users } from "../schema";

export async function getUserById(id: string) {
  return db.query.users.findFirst({
    where: eq(users.id, id),
  });
}
```

### Use Query Builder

Prefer Drizzle's query builder over raw SQL:

```typescript
// Good
const user = await db.query.users.findFirst({
  where: eq(users.email, email),
  with: {
    subscription: true,
  },
});

// Avoid raw SQL unless necessary
const result = await db.execute(sql`SELECT * FROM users WHERE email = ${email}`);
```

### Error Handling

Use the Result pattern for database operations:

```typescript
export async function createProject(
  data: NewProject
): Promise<Result<Project>> {
  try {
    const [project] = await db.insert(projects).values(data).returning();

    if (!project) {
      return { success: false, error: new Error("Failed to create project") };
    }

    return { success: true, data: project };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

## File Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | kebab-case | `user-menu.tsx` |
| Utilities | kebab-case | `format-date.ts` |
| Types | kebab-case | `user-types.ts` |
| Tests | kebab-case + suffix | `user-menu.test.tsx` |
| E2E Tests | kebab-case + suffix | `auth.spec.ts` |

## Import Order

Imports should be organized (Biome handles this):

```typescript
// 1. React/Next
import { useState } from "react";
import { NextResponse } from "next/server";

// 2. External packages
import { z } from "zod";
import { eq } from "drizzle-orm";

// 3. Internal packages (@repo/*)
import { db, users } from "@repo/database";
import { stripe } from "@repo/payments";

// 4. App imports (@/*)
import { getSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";

// 5. Relative imports
import { formatPrice } from "./utils";
```

## Git Commits

Use conventional commits:

```
feat: add user profile page
fix: correct subscription status mapping
chore: update dependencies
docs: add API documentation
refactor: extract auth middleware
test: add billing API tests
```

## Comments

Only add comments when the logic isn't self-evident:

```typescript
// Good - explains non-obvious business logic
// Stripe webhook events may arrive out of order, so we use upsert
await upsertSubscription(userId, subscription);

// Bad - restates what the code does
// Get the user by ID
const user = await getUserById(id);
```

## Error Messages

Error messages should be:
- Human-readable
- Actionable when possible
- Not expose internal details

```typescript
// Good
"Invalid email address"
"Project not found"
"Session expired, please sign in again"

// Bad
"Error: INVALID_INPUT_0x003"
"Query failed: relation 'projects' does not exist"
"TypeError: Cannot read property 'id' of undefined"
```
