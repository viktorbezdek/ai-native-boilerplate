---
name: code-synthesizer
description: Generates implementation code from specs. Understands 12 languages, respects project conventions, injects proper error handling.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
---

# Code Synthesizer

Generates high-quality implementation code that respects project conventions and patterns.

## Supported Languages
TypeScript, JavaScript, Python, Go, Rust, Java, C#, Ruby, PHP, Swift, Kotlin, SQL

## Code Standards

## TypeScript

### Strict Mode
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true
  }
}
```

### No `any`
```typescript
// ❌ Bad
function process(data: any) { ... }

// ✅ Good
function process(data: UserData) { ... }

// ✅ Good (when truly unknown)
function process(data: unknown) {
  if (isUserData(data)) { ... }
}
```

### Explicit Return Types
```typescript
// ❌ Bad
function getUser(id: string) {
  return db.users.find(id);
}

// ✅ Good
function getUser(id: string): Promise<User | null> {
  return db.users.find(id);
}
```

### Type vs Interface
```typescript
// Use `type` for data shapes
type UserData = {
  id: string;
  name: string;
};

// Use `interface` for contracts/extensibility
interface Repository<T> {
  find(id: string): Promise<T | null>;
  save(item: T): Promise<T>;
}
```

## React

### Server Components Default
```typescript
// app/page.tsx - Server Component (default)
export default async function Page() {
  const data = await fetchData();
  return <div>{data}</div>;
}
```

### Client Components Only When Needed
```typescript
// components/counter.tsx
"use client";

import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

### Named Exports
```typescript
// ❌ Bad
export default function Button() { ... }

// ✅ Good
export function Button() { ... }
```

### Props Interface
```typescript
// ✅ Good
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}

export function Button({ children, onClick, variant = "primary", disabled }: ButtonProps) {
  // ...
}
```

## Next.js

### Route Organization
```
app/
├── (marketing)/        # Public pages group
│   ├── page.tsx       # Home
│   └── about/page.tsx
├── (auth)/            # Auth pages group
│   ├── sign-in/page.tsx
│   └── sign-up/page.tsx
├── (dashboard)/       # Protected pages group
│   ├── layout.tsx     # Shared layout
│   └── page.tsx
└── api/              # API routes
    └── health/route.ts
```

### Server Actions
```typescript
// server/actions/users.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

const updateSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function updateProfile(formData: FormData) {
  const result = updateSchema.safeParse({
    name: formData.get("name"),
  });

  if (!result.success) {
    return { error: result.error.flatten() };
  }

  // Update database
  await db.users.update(result.data);
  
  revalidatePath("/profile");
  return { success: true };
}
```

### API Routes
```typescript
// app/api/users/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const result = schema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten() },
      { status: 400 }
    );
  }

  const user = await createUser(result.data);
  return NextResponse.json(user, { status: 201 });
}
```

## Error Handling

### Result Pattern
```typescript
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

async function getUser(id: string): Promise<Result<User>> {
  try {
    const user = await db.users.find(id);
    if (!user) {
      return { success: false, error: new Error("Not found") };
    }
    return { success: true, data: user };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

### Error Boundaries
```typescript
// app/error.tsx
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```
