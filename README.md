# AI-Native Boilerplate

A production-ready Next.js 15 boilerplate with comprehensive Claude Code AI integration. Built for developers who want to leverage AI-assisted development from day one.

## Features

### Core Stack
- **Next.js 15** with App Router and React 19
- **TypeScript** with strict mode
- **Bun** as package manager and runtime
- **Biome** for linting and formatting (10-25x faster than ESLint)

### Database & Auth
- **Neon PostgreSQL** with serverless branching
- **Drizzle ORM** for type-safe database operations
- **Better Auth** for authentication (email, OAuth)

### Payments & Email
- **Stripe** integration with subscriptions
- **Resend** for transactional emails
- React Email templates

### Analytics & Monitoring
- **PostHog** analytics with feature flags
- **Sentry** error tracking
- Session replay and user insights

### AI-Native Development
- **Claude Code** configuration
- 10 slash commands for common tasks
- 8 specialized subagents
- 12 development skills
- Self-improvement feedback loops

## Quick Start

### Prerequisites
- [Bun](https://bun.sh) v1.1.38+
- [Node.js](https://nodejs.org) v20+ (for Playwright)
- PostgreSQL database (or [Neon](https://neon.tech) account)

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-native-boilerplate.git
cd ai-native-boilerplate

# Install dependencies
bun install

# Copy environment variables
cp .env.example .env.local

# Setup database
bun run db:push

# Start development server
bun run dev
```

### Environment Variables

See `.env.example` for all required variables. Key ones:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Auth secret (min 32 chars) |
| `STRIPE_SECRET_KEY` | Stripe API key |
| `RESEND_API_KEY` | Resend API key |

## Project Structure

```
ai-native-boilerplate/
├── .claude/                 # Claude Code configuration
│   ├── settings.json        # MCP servers, hooks, permissions
│   ├── commands/            # Slash commands (/plan, /test, etc.)
│   ├── agents/              # Specialized subagents
│   ├── skills/              # Development patterns
│   └── hooks/               # Pre/post tool hooks
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (auth)/          # Authentication pages
│   │   ├── (dashboard)/     # Protected dashboard
│   │   └── api/             # API routes
│   ├── components/          # React components
│   │   ├── ui/              # shadcn/ui primitives
│   │   └── features/        # Feature components
│   └── lib/                 # Utilities
│       ├── db/              # Database schema & queries
│       ├── actions/         # Server actions
│       └── validations/     # Zod schemas
├── tests/                   # Test suites
│   ├── unit/                # Vitest unit tests
│   ├── integration/         # API integration tests
│   └── e2e/                 # Playwright E2E tests
└── emails/                  # React Email templates
```

## Claude Code Integration

This boilerplate is designed for AI-native development with Claude Code.

### Slash Commands

| Command | Description |
|---------|-------------|
| `/plan` | Decompose requirements into tasks |
| `/implement` | Generate code with tests |
| `/test` | Run tests with coverage |
| `/review` | Code review and security check |
| `/deploy` | Deploy to Vercel |
| `/fix-issue` | Analyze and fix GitHub issues |
| `/analyze` | Codebase analysis |
| `/audit` | Security/accessibility audit |
| `/release` | Version bump and changelog |
| `/optimize` | Self-improvement cycle |

### Subagents

Specialized agents for different tasks:

- **planner**: Requirements → task decomposition
- **developer**: Code generation with TDD
- **tester**: Test creation and coverage
- **reviewer**: Security and code quality
- **deployer**: Production deployments
- **analyst**: Analytics and metrics
- **auditor**: Independent audits
- **optimizer**: Configuration evolution

### MCP Servers

Pre-configured integrations:

- **filesystem**: Local file access
- **github**: Repository management
- **postgres**: Database operations
- **fetch**: HTTP requests
- **sequential-thinking**: Complex reasoning

## Scripts

```bash
# Development
bun run dev          # Start dev server
bun run build        # Build for production
bun run start        # Start production server

# Database
bun run db:generate  # Generate migrations
bun run db:push      # Push schema changes
bun run db:studio    # Open Drizzle Studio

# Testing
bun run test         # Run all tests
bun run test:unit    # Run unit tests
bun run test:e2e     # Run E2E tests
bun run test:coverage # Coverage report

# Code Quality
bun run lint         # Run Biome linter
bun run format       # Format code
bun run typecheck    # TypeScript check
```

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Set environment variables
3. Deploy

```bash
vercel --prod
```

### Manual

```bash
bun run build
bun run start
```

## Testing

### Unit Tests (Vitest)
```bash
bun run test:unit
```

### Integration Tests
```bash
bun run test:integration
```

### E2E Tests (Playwright)
```bash
bun run test:e2e
```

### Coverage
```bash
bun run test:coverage
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

Built with ❤️ for AI-native development.
