# AI-Native Boilerplate

## Overview
Production-ready monorepo template for building AI-native products. Full test coverage, automated workflows, and best practices baked in.

## Stack
- **Runtime**: Bun 1.x
- **Framework**: Next.js 15 (App Router, RSC, Turbopack)
- **Database**: Neon PostgreSQL + Drizzle ORM
- **Auth**: Better Auth (email/password + OAuth)
- **Payments**: Stripe (subscriptions)
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Linting**: Biome (format + lint)
- **Monorepo**: Turborepo

## Commands
```bash
bun dev              # Start dev server
bun build            # Production build
bun test             # Unit tests
bun test:coverage    # Tests with coverage
bun test:e2e         # E2E tests (Playwright)
bun lint             # Lint check
bun lint:fix         # Auto-fix lint issues
bun format           # Format code
bun typecheck        # TypeScript check
bun db:generate      # Generate migrations
bun db:migrate       # Run migrations
bun db:push          # Push schema (dev)
bun db:studio        # Drizzle Studio
bun setup            # Initial project setup
bun verify           # Verify environment
bun clean            # Clean build artifacts
```

## Project Structure
```
ai-native-boilerplate/
├── apps/
│   └── web/                    # Next.js application
│       └── src/
│           ├── app/            # App Router pages
│           ├── components/     # React components
│           └── lib/            # App-specific utilities
├── packages/
│   ├── database/               # Drizzle schema + queries
│   ├── ui/                     # Shared UI components
│   ├── validations/            # Zod schemas
│   ├── utils/                  # Shared utilities
│   ├── payments/               # Stripe integration
│   ├── email/                  # Email templates (Resend)
│   └── autonomous/             # AI development system
└── scripts/                    # Setup and utility scripts
```

## Conventions

### TypeScript
- Strict mode enabled, no `any` allowed
- Use `type` for object shapes, `interface` for extensible contracts
- Explicit return types on public functions

### React/Next.js
- Server Components by default
- Use `"use client"` only when necessary
- Colocate components with routes when possible
- Named exports for components

### Database
- Schema in `packages/database/src/schema.ts`
- Queries in `packages/database/src/queries/`
- Use Drizzle's query builder, not raw SQL

### Testing
- 80% coverage minimum
- Unit tests with Vitest, E2E with Playwright

### Git
- Conventional commits: `feat|fix|chore|docs|refactor|test`
- PRs require review

## Code Patterns

### Server Actions
```typescript
// apps/web/src/lib/actions/example.ts
"use server";

import { z } from "zod";
import { actionClient } from "@/lib/safe-action";

const schema = z.object({ name: z.string().min(1) });

export const updateProfile = actionClient
  .schema(schema)
  .action(async ({ parsedInput }) => {
    // Implementation
  });
```

### API Routes
```typescript
// apps/web/src/app/api/v1/example/route.ts
import { NextResponse } from "next/server";
import { exampleSchema } from "@repo/validations";

export async function POST(request: Request) {
  const body = await request.json();
  const result = exampleSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Implementation
}
```

### Using Shared Packages
```typescript
import { db, users } from "@repo/database";
import { Button } from "@repo/ui";
import { cn } from "@repo/utils";
import { userSchema } from "@repo/validations";
import { stripe } from "@repo/payments";
```

## Protected Files
- `.env*` — Environment configuration
- `apps/web/drizzle/migrations/*` — Applied migrations
- `*.key`, `*.pem` — Security credentials
