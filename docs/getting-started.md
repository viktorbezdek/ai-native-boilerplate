# Getting Started

This guide walks you through setting up the AI-Native Boilerplate for local development. By the end, you'll have a working application with database, authentication, and AI tooling.

## Prerequisites

| Tool | Version | Required | Installation |
|------|---------|----------|--------------|
| **Bun** | 1.1.38+ | Yes | [bun.sh](https://bun.sh) |
| **Node.js** | 20+ | Yes | [nodejs.org](https://nodejs.org) |
| **Docker** | 24+ | Only for `--local` mode | [docker.com](https://docker.com) |
| **Claude Code** | Latest | Recommended | [claude.ai/code](https://claude.ai/code) |

### Installing Bun

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"

# Verify installation
bun --version  # Should be 1.1.38 or higher
```

### Installing Node.js

Playwright (E2E testing) requires Node.js. Install via your preferred method:

```bash
# Using nvm (recommended)
nvm install 20
nvm use 20

# Or download from nodejs.org
```

## Setup Modes

The boilerplate supports multiple setup modes depending on your needs.

### 1. Instant Database (Recommended for Getting Started)

**Best for**: Quick start, prototyping, learning the codebase.

```bash
bun install
bun setup
bun dev
```

This provisions a free Neon database automatically via [neon.new](https://neon.new). No account required.

**Limitations**:
- Database expires in 72 hours
- Run `bun db:claim` to make it permanent (free Neon account)

### 2. Your Own Neon Database

**Best for**: Persistent development, team environments.

```bash
bun install
bun setup --quick
```

The wizard prompts for your `DATABASE_URL`. Get one at [neon.tech](https://neon.tech) (free tier available).

### 3. Full Local (Docker)

**Best for**: Offline development, CI environments, full control.

```bash
bun install
bun setup --local
```

This starts PostgreSQL and Mailpit (email testing) in Docker containers.

```bash
# Manage Docker services
bun docker:up     # Start services
bun docker:down   # Stop services
bun docker:logs   # View logs
```

### 4. CI Mode

**Best for**: Automated pipelines, GitHub Actions.

```bash
bun setup --ci
```

Non-interactive mode. Expects environment variables to be pre-configured.

## Step-by-Step: First Run

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/ai-native-boilerplate.git
cd ai-native-boilerplate
bun install
```

### 2. Run Setup Wizard

```bash
bun setup
```

The wizard:
1. Detects your environment
2. Provisions or connects a database
3. Generates `BETTER_AUTH_SECRET` (32+ character random string)
4. Creates `.env.local` with required variables
5. Pushes database schema

### 3. Start Development Server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000). You should see the landing page.

### 4. Verify Everything Works

```bash
bun verify
```

This checks:
- Environment variables are set
- Database connection works
- TypeScript compiles
- Lint passes
- Tests pass

## What's Configured After Setup

After running `bun setup`, your `.env.local` contains:

```bash
# Core (always configured)
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=<random-32-chars>
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional (add later as needed)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
NEXT_PUBLIC_POSTHOG_KEY=
SENTRY_DSN=
```

The application works without optional services. Features gracefully degrade:
- No Stripe: Payment buttons hidden
- No Resend: Emails logged to console
- No PostHog: Analytics disabled
- No Sentry: Errors logged locally

## Project Tour

After setup, explore the key directories:

```
apps/web/src/
├── app/                    # Next.js routes
│   ├── (auth)/            # /sign-in, /sign-up
│   ├── (dashboard)/       # /dashboard (protected)
│   └── api/               # API endpoints
├── components/            # React components
│   ├── ui/                # shadcn/ui primitives
│   └── features/          # Domain components
└── lib/                   # Core utilities
    ├── auth/              # Better Auth config
    ├── db.ts              # Database connection
    └── stripe/            # Stripe client
```

### Key Files to Know

| File | Purpose |
|------|---------|
| `apps/web/src/lib/env.ts` | Environment validation (Zod) |
| `packages/database/src/schema.ts` | Database schema |
| `CLAUDE.md` | AI instructions (Claude Code reads this) |
| `.claude/settings.json` | Claude Code hooks and permissions |

## Testing the Setup

### Create an Account

1. Go to [http://localhost:3000/sign-up](http://localhost:3000/sign-up)
2. Enter email and password
3. You're redirected to the dashboard

### Check Database

```bash
bun db:studio
```

Opens Drizzle Studio at [https://local.drizzle.studio](https://local.drizzle.studio). You can browse tables and see your new user.

### Run Tests

```bash
# Unit + integration tests
bun test

# E2E tests (requires browser)
bun test:e2e
```

## Working with Claude Code

If you have Claude Code installed, the boilerplate is pre-configured for AI-assisted development.

### Start a Session

Open the project folder in Claude Code. It automatically reads `CLAUDE.md` and `.claude/settings.json`.

### Try a Command

```
/plan Add a "forgot password" feature
```

Claude Code breaks this down into tasks, considering the existing auth setup.

### Memory System

The project uses `claude-mem` for persistent AI memory:

```bash
# Check memory status
bun memory:status

# Start memory worker (usually automatic)
bun memory:start
```

See [AI Infrastructure Guide](./ai-infrastructure.md) for details.

## Common Issues

### "Database connection failed"

**Instant database**: The database may have expired (72-hour limit).

```bash
# Re-provision
rm .env.local
bun setup
```

**Local Docker**: Check if containers are running.

```bash
docker ps
bun docker:up
```

### "Module not found" errors

Rebuild packages:

```bash
bun install
bun build
```

### Port 3000 in use

```bash
# Find what's using it
lsof -i :3000

# Or use a different port
PORT=3001 bun dev
```

### TypeScript errors after pulling changes

```bash
bun install
bun typecheck
```

## Next Steps

1. **Configure services**: [Services Guide](./services.md) - Add Stripe, email, analytics
2. **Set up CI/CD**: [GitHub CI/CD Guide](./github-ci-cd.md) - Automated testing and deploys
3. **Learn AI workflows**: [AI Infrastructure Guide](./ai-infrastructure.md) - Get the most from Claude Code
4. **Go to production**: [Production Guide](./production.md) - Deploy to Vercel

## Upgrading an Existing Project

If you're updating from an older version:

```bash
# Pull latest changes
git pull origin main

# Update dependencies
bun install

# Run migrations if schema changed
bun db:migrate

# Verify everything still works
bun verify
```

Check `CHANGELOG.md` for breaking changes.
