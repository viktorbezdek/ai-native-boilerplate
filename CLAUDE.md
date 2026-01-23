# AI-Native Boilerplate

## Overview
Production-ready template for building AI-native products. Full test coverage, automated workflows, and best practices baked in. Designed for autonomous development with Claude Code.

## Stack
- **Runtime**: Bun 1.x (fastest JS runtime)
- **Framework**: Next.js 15 (App Router, RSC, PPR)
- **Database**: Neon PostgreSQL + Drizzle ORM
- **Auth**: Better Auth (email/password + OAuth)
- **Payments**: Stripe (subscriptions)
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Linting**: Biome (format + lint)
- **AI Memory**: Claude-mem (project-level persistent memory)
- **Autonomous**: @repo/autonomous (self-developing system)

## Commands
```bash
bun dev              # Start dev server (Turbopack)
bun build            # Production build
bun test             # Unit tests (Vitest)
bun test:coverage    # Tests with coverage
bun test:e2e         # E2E tests (Playwright)
bun lint             # Biome lint check
bun lint:fix         # Auto-fix lint issues
bun db:generate      # Generate migrations
bun db:migrate       # Run migrations
bun db:push          # Push schema (dev)
bun db:studio        # Drizzle Studio
bun db:seed          # Seed database
bun typecheck        # TypeScript check
```

## Project Structure
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth routes (sign-in, sign-up)
│   ├── (dashboard)/       # Protected dashboard
│   ├── (marketing)/       # Public pages
│   └── api/               # API routes
├── components/
│   ├── ui/                # shadcn/ui primitives
│   └── features/          # Feature components
├── lib/
│   ├── db/                # Drizzle schema + queries
│   ├── auth/              # Better Auth config
│   ├── payments/          # Stripe integration
│   └── utils/             # Shared utilities
├── server/
│   ├── actions/           # Server actions
│   └── services/          # Business logic
└── types/                 # TypeScript types
```

## Conventions

### TypeScript
- Strict mode enabled, no `any` allowed
- Use `type` for object shapes, `interface` for extensible contracts
- Explicit return types on public functions

### React/Next.js
- Server Components by default
- Use `"use client"` only when necessary (interactivity)
- Colocate components with their routes when possible
- Named exports for components

### Database
- All queries in `src/lib/db/queries/`
- Use Drizzle's query builder, not raw SQL
- Always handle errors with Result pattern

### Testing
- TDD: Write tests before implementation
- 80% coverage minimum, 95% for critical paths
- No flaky tests (max 3 retries)

### Git
- Conventional commits: `feat|fix|chore|docs|refactor|test`
- No direct commits to main
- PRs require review

## Documentation
- Architecture: @.claude/docs/architecture.md
- API Standards: @.claude/docs/api-standards.md
- Testing Guide: @.claude/docs/testing-guide.md
- Conventions: @.claude/docs/conventions.md

## Critical Restrictions

### Protected Files (DO NOT MODIFY)
- `.env*` — Environment configuration
- `drizzle/migrations/*` — Applied migrations
- `*.key`, `*.pem` — Security credentials

### Dangerous Operations (REQUIRE APPROVAL)
- Database migrations on production
- Deleting user data
- Modifying auth configuration
- Force pushing to any branch

## Code Patterns

### Server Actions
```typescript
// src/server/actions/users.ts
"use server";

import { z } from "zod";
import { actionClient } from "@/lib/safe-action";

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100),
});

export const updateProfile = actionClient
  .schema(updateProfileSchema)
  .action(async ({ parsedInput, ctx }) => {
    // Implementation
  });
```

### API Routes
```typescript
// src/app/api/[resource]/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ /* ... */ });

export async function POST(request: Request) {
  const body = await request.json();
  const result = schema.safeParse(body);
  
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten() },
      { status: 400 }
    );
  }
  
  // Implementation
}
```

### Error Handling
```typescript
// Result pattern
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

async function getUserById(id: string): Promise<Result<User>> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });
    
    if (!user) {
      return { success: false, error: new Error("User not found") };
    }
    
    return { success: true, data: user };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

## AI Infrastructure

### Autonomous Development System
The project includes a self-developing product architecture in `packages/autonomous/`:
- **Confidence Engine**: Weighted scoring from 8 signal sources (>95% auto-execute, 80-95% notify, <60% escalate)
- **Benchmark Runner**: Quality measurement across 5 dimensions (quality, completeness, efficiency, drift, speed)
- **Signal Processor**: Multi-source ingestion from Sentry, PostHog, Vercel, local logs
- **Trigger Engine**: Scheduled, threshold, and event-driven automation
- **Learning Engine**: Pattern extraction and skill scoring
- **Config Evolver**: A/B testing of configuration changes

Key commands:
```bash
/autonomous start # Start self-developing loop
/optimize ai      # Analyze and improve AI configuration
/status           # Check workflow status
```

### Hooks System
Project hooks in `.claude/hooks/`:
- `telemetry.sh` - Track tool usage metrics
- `track-execution.sh` - Log execution results
- `track-drift.sh` - Detect scope creep
- `track-quality.sh` - Monitor test/lint results
- `validate-commit.sh` - Pre-commit validation
- `validate-changes.sh` - Post-write validation
- `session-summary.sh` - Session completion summary

### Skills Library
22 specialized skills in `.claude/skills/`:
- **Development**: code-review, code-synthesizer, refactor-engine, tdd-orchestrator
- **Infrastructure**: cicd-pipelines, deploy-strategist, incident-responder
- **Analysis**: analytics-setup, architecture-advisor, cost-optimizer
- **Quality**: test-amplifier, vulnerability-scanner, compliance-checker

## Active Context
<!-- Auto-updated by optimizer subagent -->
- **Current Focus**: Hook reliability and metrics accuracy
- **Recent Changes**: Fixed quality tracking regex, added drift deduplication, skip empty sessions
- **Next Steps**: Verify metrics capture actual test/lint counts
- **Blockers**: None
