# Operations Guide

This guide covers day-to-day operations: development workflows, database management, testing, and maintenance tasks.

## Daily Development Workflow

### Starting a Work Session

```bash
# 1. Pull latest changes
git pull origin main

# 2. Install any new dependencies
bun install

# 3. Start development server
bun dev

# 4. (Optional) Start memory worker for Claude Code
bun memory:start
```

### Before Committing

```bash
# Run full verification suite
bun verify

# This runs:
# - bun lint
# - bun typecheck
# - bun test
# - bun build
```

Or run checks individually:

```bash
bun lint        # Code style
bun typecheck   # TypeScript
bun test        # Unit + integration tests
bun build       # Production build
```

### Creating a Feature Branch

```bash
git checkout -b feat/user-notifications
# ... make changes ...
bun verify
git add .
git commit -m "feat: add user notification system"
git push -u origin feat/user-notifications
```

## Database Operations

### Schema Changes

The database schema lives in `packages/database/src/schema.ts`.

#### Development (Push Changes)

For rapid iteration during development:

```bash
# Push schema directly (no migration file)
bun db:push
```

This synchronizes your database with the schema. Use for development only.

#### Production (Generate Migrations)

For production-ready changes:

```bash
# 1. Make schema changes in packages/database/src/schema.ts

# 2. Generate migration
bun db:generate

# 3. Review the generated migration
cat drizzle/migrations/[timestamp]_*.sql

# 4. Apply migration
bun db:migrate
```

### Viewing Data

```bash
# Open Drizzle Studio (GUI)
bun db:studio
```

Opens [https://local.drizzle.studio](https://local.drizzle.studio) where you can:
- Browse tables
- Run queries
- Edit data
- Export data

### Seeding Data

```bash
# Run seed script
bun db:seed
```

The seed script is at `packages/database/src/seed.ts`. Customize it for your needs:

```typescript
// packages/database/src/seed.ts
import { db, users, projects } from './index';

async function seed() {
  // Create test user
  await db.insert(users).values({
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
  });

  // Create test projects
  await db.insert(projects).values([
    { name: 'Project 1', userId: 'user-1' },
    { name: 'Project 2', userId: 'user-1' },
  ]);
}

seed().catch(console.error);
```

### Database Branching (Neon)

Neon supports database branching for testing schema changes:

```bash
# Create a branch for testing
npx neonctl branches create --name test-migration

# Get the branch connection string
npx neonctl branches list

# Test migration on branch
DATABASE_URL=<branch-url> bun db:migrate

# Delete branch after testing
npx neonctl branches delete test-migration
```

### Resetting Database

#### Instant Database (Instagres)

```bash
rm .env.local
bun setup
```

#### Local Docker

```bash
bun docker:down
docker volume rm ainative_postgres_data
bun docker:up
bun db:push
bun db:seed
```

#### Neon (Your Database)

```bash
# Drop all tables and recreate
bun db:push --force
bun db:seed
```

## Testing

### Test Structure

```
apps/web/tests/
├── unit/           # Fast, isolated tests
├── integration/    # API route tests
├── e2e/            # Browser tests (Playwright)
└── mocks/          # Shared mock utilities
```

### Running Tests

```bash
# All tests
bun test

# With coverage report
bun test:coverage

# Watch mode (re-run on changes)
bun test:watch

# Specific file
bun test src/lib/utils.test.ts

# Specific pattern
bun test -- --grep "auth"
```

### E2E Tests

```bash
# Run all E2E tests
bun test:e2e

# Run with UI (see browser)
bunx playwright test --ui

# Run specific test file
bunx playwright test tests/e2e/auth.spec.ts

# Debug mode
bunx playwright test --debug
```

### Writing Tests

#### Unit Test Example

```typescript
// tests/unit/utils.test.ts
import { describe, expect, it } from 'vitest';
import { formatPrice } from '@/lib/utils';

describe('formatPrice', () => {
  it('formats USD correctly', () => {
    expect(formatPrice(1999, 'usd')).toBe('$19.99');
  });

  it('handles zero', () => {
    expect(formatPrice(0, 'usd')).toBe('$0.00');
  });
});
```

#### Integration Test Example

```typescript
// tests/integration/api/users.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockRequest } from '../helpers';

const mockGetSession = vi.fn();

describe('GET /api/v1/users/me', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('@/lib/auth', () => ({
      getSession: mockGetSession,
    }));
  });

  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const { GET } = await import('@/app/api/v1/users/me/route');
    const response = await GET(createMockRequest({ method: 'GET' }));

    expect(response.status).toBe(401);
  });
});
```

#### E2E Test Example

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('user can sign in', async ({ page }) => {
  await page.goto('/sign-in');

  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard');
});
```

### Test Coverage

```bash
# Generate coverage report
bun test:coverage

# View HTML report
open apps/web/coverage/index.html
```

Coverage targets:
- **Overall**: 80% minimum
- **Critical paths** (auth, payments): 95% minimum

## Code Quality

### Linting

```bash
# Check for issues
bun lint

# Auto-fix issues
bun lint:fix
```

Biome rules are configured in `tooling/biome-config/biome.json`.

### Formatting

```bash
# Check formatting
bun format:check

# Fix formatting
bun format
```

### Type Checking

```bash
bun typecheck
```

Fix common issues:
- Add explicit return types to public functions
- Replace `any` with `unknown` and narrow
- Add missing type imports

## Dependency Management

### Adding Dependencies

```bash
# Add to root (shared tooling)
bun add -D typescript

# Add to specific workspace
bun add zod --filter @repo/validations

# Add to web app
bun add lucide-react --filter web
```

### Updating Dependencies

```bash
# Check for outdated
bun outdated

# Update all
bun update

# Update specific package
bun update next
```

### Version Synchronization

Keep package versions consistent across workspaces:

```bash
# Check for mismatches
bun syncpack:list

# Fix mismatches
bun syncpack:fix
```

## Monorepo Operations

### Building Packages

```bash
# Build all packages
bun build

# Build specific package
bun build --filter @repo/database
```

### Package Dependencies

The dependency graph:

```
apps/web
├── @repo/database
├── @repo/payments
├── @repo/email
├── @repo/ui
├── @repo/utils
└── @repo/validations
```

### Creating a New Package

```bash
mkdir -p packages/my-package/src
cd packages/my-package
```

Create `package.json`:

```json
{
  "name": "@repo/my-package",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "biome lint .",
    "typecheck": "tsc --noEmit"
  }
}
```

Add to consuming package:

```json
{
  "dependencies": {
    "@repo/my-package": "workspace:*"
  }
}
```

## Docker Operations

### Starting Services

```bash
bun docker:up
```

Services available:

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5432 | Database |
| Mailpit Web | 8025 | Email inbox viewer |
| Mailpit SMTP | 1025 | Email sending |

### Viewing Logs

```bash
# All services
bun docker:logs

# Specific service
docker compose logs -f postgres
```

### Stopping Services

```bash
bun docker:down
```

### Stripe Webhook Testing

```bash
# Start Stripe CLI listener
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copy the webhook signing secret and add to .env.local
STRIPE_WEBHOOK_SECRET=whsec_...
```

Or use Docker profile:

```bash
docker compose -f docker-compose.local.yml --profile stripe up -d
```

## Maintenance Tasks

### Clearing Caches

```bash
# Turbo cache
rm -rf .turbo

# Next.js cache
rm -rf apps/web/.next

# Node modules (nuclear option)
rm -rf node_modules
bun install
```

### Updating Git Submodules

```bash
bun prepare
# or
git submodule update --init --recursive
```

### Log Rotation

Claude Code logs accumulate in `.claude/logs/`. Periodically clean old entries:

```bash
# Keep last 1000 lines of each log
for file in .claude/logs/*.jsonl; do
  tail -1000 "$file" > "$file.tmp" && mv "$file.tmp" "$file"
done
```

### Health Check

Run periodically to ensure everything is working:

```bash
bun verify
```

This validates:
- Environment variables are set
- Database connection works
- All tests pass
- TypeScript compiles
- Lint passes
- Build succeeds

## Environment Management

### Multiple Environments

Create environment files for different contexts:

```
.env.local          # Local development (gitignored)
.env.test           # Test environment
.env.production     # Production (gitignored, set in Vercel)
```

### Environment Validation

Environment variables are validated at build time via `apps/web/src/lib/env.ts`:

```typescript
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  // ...
});

export const env = envSchema.parse(process.env);
```

Add new variables:
1. Add to `.env.example` (documentation)
2. Add to `env.ts` (validation)
3. Add to `turbo.json` globalEnv if needed in build

### Secrets Rotation

Periodically rotate secrets:

```bash
# Generate new auth secret
openssl rand -base64 32

# Update in .env.local and Vercel
```
