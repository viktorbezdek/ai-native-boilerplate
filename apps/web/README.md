# AI-Native Boilerplate

Production-ready monorepo template for building AI-native SaaS products with Next.js, Stripe, and modern tooling.

## Features

- **Next.js 15** with App Router, Server Components, and Turbopack
- **Authentication** via Better Auth (email/password + OAuth)
- **Payments** via Stripe (subscriptions + one-time)
- **Database** with Neon PostgreSQL + Drizzle ORM
- **Styling** with Tailwind CSS 4 + shadcn/ui components
- **Testing** with Vitest (unit) + Playwright (E2E)
- **Linting** with Biome (fast, unified formatter + linter)
- **Monorepo** powered by Turborepo + Bun workspaces

## Quick Start

```bash
# Install dependencies
bun install

# Set up environment (interactive)
bun setup

# Start development server
bun dev
```

## Project Structure

```
├── apps/
│   └── web/                 # Next.js application
├── packages/
│   ├── database/            # Drizzle schema + queries
│   ├── ui/                  # Shared UI components
│   ├── validations/         # Zod schemas
│   ├── utils/               # Shared utilities
│   ├── payments/            # Stripe integration
│   └── email/               # Email templates
└── scripts/                 # Setup scripts
```

## Commands

| Command | Description |
|---------|-------------|
| `bun dev` | Start development server |
| `bun build` | Production build |
| `bun test` | Run unit tests |
| `bun test:e2e` | Run E2E tests |
| `bun lint` | Lint code |
| `bun lint:fix` | Fix lint issues |
| `bun format` | Format code |
| `bun typecheck` | TypeScript check |
| `bun db:push` | Push schema to database |
| `bun db:studio` | Open Drizzle Studio |

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Database (Neon)
DATABASE_URL=

# Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Email (Resend)
RESEND_API_KEY=

# Analytics (PostHog)
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
```

## Development

### Adding UI Components

```bash
# From apps/web directory
bunx shadcn@latest add button
```

### Database Changes

```bash
# Edit schema in packages/database/src/schema.ts
# Then generate and apply migration
bun db:generate
bun db:migrate
```

### Running Tests

```bash
bun test              # Unit tests
bun test:coverage     # With coverage
bun test:e2e          # E2E tests
```

## Deployment

The app is configured for Vercel deployment:

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

## License

MIT
