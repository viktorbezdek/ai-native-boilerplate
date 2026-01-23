# AI-Native Boilerplate

A production-ready Next.js 15 template built for autonomous AI-assisted development. Ship faster with Claude Code integration, self-improving workflows, and battle-tested infrastructure.

## Why This Exists

**Problem**: Building production applications requires weeks of boilerplate setup—auth, payments, database, testing, CI/CD, monitoring. Adding AI assistance means more configuration. Most developers spend more time on infrastructure than product.

**Solution**: A complete, working application with AI-native development baked in. Clone, configure, and start building features in under 5 minutes. Claude Code understands the codebase and can autonomously handle routine tasks.

## What You Get

| Layer | Technology | Why |
|-------|------------|-----|
| **Runtime** | Bun 1.x | Fastest JavaScript runtime, 3x faster installs |
| **Framework** | Next.js 15 | App Router, React Server Components, edge-ready |
| **Database** | Neon PostgreSQL | Serverless, branching, instant provisioning |
| **ORM** | Drizzle | Type-safe queries, zero runtime overhead |
| **Auth** | Better Auth | Email/password + OAuth, session management |
| **Payments** | Stripe | Subscriptions, checkout, webhooks |
| **Email** | Resend | Transactional emails with React templates |
| **Analytics** | PostHog | Product analytics, feature flags, session replay |
| **Errors** | Sentry | Error tracking with source maps |
| **AI** | Claude Code | Autonomous development, memory, specialized agents |
| **Testing** | Vitest + Playwright | Unit, integration, and E2E testing |
| **CI/CD** | GitHub Actions | Automated testing, preview deploys, releases |

## Quick Start

```bash
# Clone and install
git clone https://github.com/yourusername/ai-native-boilerplate.git
cd ai-native-boilerplate
bun install

# Interactive setup (creates instant database, generates secrets)
bun setup

# Start development
bun dev
```

Open [http://localhost:3000](http://localhost:3000). The app is running with a working database.

**That's it.** No manual env configuration. No Docker required. Database provisioned automatically.

> For production use, create a permanent database at [neon.tech](https://neon.tech) (free tier available).

## Documentation

| Guide | Description |
|-------|-------------|
| [Getting Started](./docs/getting-started.md) | Setup modes, prerequisites, first run |
| [AI Infrastructure](./docs/ai-infrastructure.md) | Claude Code, autonomous system, memory |
| [Operations](./docs/operations.md) | Daily workflows, database, testing |
| [Production](./docs/production.md) | Deployment, scaling, monitoring |
| [Services](./docs/services.md) | Stripe, Neon, Resend, PostHog, Sentry |
| [GitHub CI/CD](./docs/github-ci-cd.md) | Actions setup, secrets, workflows |
| [AI Specs](./docs/ai-specs.md) | Writing specs Claude Code understands |
| [Troubleshooting](./docs/troubleshooting.md) | Common issues and solutions |

## Project Structure

```
ai-native-boilerplate/
├── apps/web/                    # Next.js application
│   ├── src/
│   │   ├── app/                 # Routes (App Router)
│   │   │   ├── (auth)/          # Sign in/up (guest only)
│   │   │   ├── (dashboard)/     # Protected routes
│   │   │   ├── (marketing)/     # Public pages
│   │   │   └── api/             # REST API + webhooks
│   │   ├── components/          # UI components
│   │   └── lib/                 # Core utilities
│   └── tests/                   # Test suites
├── packages/
│   ├── autonomous/              # Self-developing AI system
│   ├── database/                # Drizzle schema + queries
│   ├── payments/                # Stripe integration
│   ├── email/                   # Resend templates
│   └── ui/                      # Shared components
├── .claude/                     # Claude Code configuration
│   ├── commands/                # Slash commands
│   ├── agents/                  # Specialized subagents
│   ├── hooks/                   # Lifecycle hooks
│   └── memory/                  # Persistent AI memory
└── .github/workflows/           # CI/CD pipelines
```

## AI-Native Development

This boilerplate is designed for development with Claude Code. The AI understands the codebase structure, conventions, and can perform autonomous tasks.

### Slash Commands

| Command | What It Does |
|---------|--------------|
| `/plan` | Break down requirements into tasks |
| `/implement` | Generate code with TDD approach |
| `/test` | Run tests, analyze coverage |
| `/review` | Security and code quality audit |
| `/deploy` | Deploy to Vercel |
| `/fix-issue` | Analyze and fix GitHub issues |

### Specialized Agents

| Agent | Purpose |
|-------|---------|
| `developer` | TDD-focused code generation |
| `tester` | Test creation and coverage |
| `reviewer` | Security and quality audits |
| `deployer` | Production deployments |
| `planner` | Feature decomposition |
| `optimizer` | Configuration evolution |

### Autonomous System

The `@repo/autonomous` package implements a self-improving development loop:

```
Sense → Analyze → Plan → Build → Verify → Deploy → Monitor → Learn → Evolve
```

- **Confidence Engine**: Scores range from 0-100. Actions above 95 auto-execute, 80-95 notify, below 60 escalate.
- **Signal Processor**: Gathers data from Sentry errors, PostHog analytics, Vercel deployments, local logs.
- **Learning Engine**: Extracts patterns from successful executions to improve future decisions.

See [AI Infrastructure Guide](./docs/ai-infrastructure.md) for configuration.

## Common Commands

```bash
# Development
bun dev              # Start dev server (Turbopack)
bun build            # Production build
bun test             # Run all tests
bun test:e2e         # E2E tests (Playwright)
bun lint             # Lint check
bun typecheck        # TypeScript check

# Database
bun db:push          # Push schema changes
bun db:studio        # Open Drizzle Studio
bun db:generate      # Generate migrations
bun db:migrate       # Run migrations

# Setup & Verification
bun setup            # Interactive setup wizard
bun verify           # Check everything works
```

## Environment Variables

Copy `.env.example` to `.env.local`. The setup wizard handles this automatically.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection |
| `BETTER_AUTH_SECRET` | Yes | Auth encryption (32+ chars) |
| `STRIPE_SECRET_KEY` | No | Payments (enable when needed) |
| `RESEND_API_KEY` | No | Email (enable when needed) |
| `NEXT_PUBLIC_POSTHOG_KEY` | No | Analytics |
| `SENTRY_DSN` | No | Error tracking |

See [Services Guide](./docs/services.md) for obtaining API keys.

## CI/CD Pipeline

GitHub Actions run automatically on push/PR:

1. **Lint & Format** - Biome checks code style
2. **Type Check** - TypeScript validation
3. **Unit Tests** - Vitest with coverage
4. **Integration Tests** - API route testing
5. **E2E Tests** - Playwright browser tests
6. **Build** - Production build verification
7. **Deploy** - Preview on PR, production on main

See [GitHub CI/CD Guide](./docs/github-ci-cd.md) for setup instructions.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines. Key points:

- Use conventional commits (`feat:`, `fix:`, `chore:`)
- Write tests for new features
- Run `bun verify` before committing

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

**Next Steps:**
1. [Set up your development environment](./docs/getting-started.md)
2. [Configure third-party services](./docs/services.md)
3. [Learn the AI development workflow](./docs/ai-infrastructure.md)
