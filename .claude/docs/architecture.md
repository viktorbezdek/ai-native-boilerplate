# Architecture

## Monorepo Structure

This project uses a Turborepo-powered monorepo with the following structure:

```
ai-native-boilerplate/
├── apps/
│   └── web/                  # Next.js application
├── packages/
│   ├── autonomous/           # Self-developing AI system
│   ├── claude-mem/           # AI memory persistence
│   ├── database/             # Drizzle ORM + schema
│   ├── email/                # Resend email integration
│   ├── payments/             # Stripe integration
│   ├── ui/                   # Shared UI components
│   ├── utils/                # Shared utilities
│   └── validations/          # Zod schemas
└── tooling/
    ├── biome-config/         # Linting configuration
    ├── typescript-config/    # TypeScript configs
    └── vitest-config/        # Test configuration
```

## Data Flow

### Request Flow

```
Client Request
     │
     ▼
Next.js Middleware (rate limiting, auth check)
     │
     ▼
API Route Handler
     │
     ├── Authentication (Better Auth)
     │
     ├── Validation (Zod schemas)
     │
     ├── Business Logic (server actions/services)
     │
     └── Database (Drizzle → Neon PostgreSQL)
     │
     ▼
Response
```

### Authentication Flow

```
Sign In/Sign Up Request
     │
     ▼
Better Auth Handler (/api/auth/*)
     │
     ├── Validate credentials
     │
     ├── Create/verify session
     │
     └── Store session in database
     │
     ▼
Set session cookie → Redirect to dashboard
```

### Payment Flow

```
Checkout Initiated
     │
     ▼
Create Stripe Checkout Session
     │
     ▼
Redirect to Stripe Checkout
     │
     ▼
Payment Complete
     │
     ▼
Stripe Webhook (checkout.session.completed)
     │
     ├── Verify signature
     │
     ├── Create/update subscription in DB
     │
     └── Track analytics event
```

## Key Components

### Web App (`apps/web`)

The main Next.js 15 application with:
- App Router with RSC and PPR
- API routes under `/api/v1/*`
- Server Actions for mutations
- Client components for interactivity

### Database Package (`packages/database`)

Shared database layer:
- Drizzle ORM schema definitions
- Query functions
- Migrations via Drizzle Kit
- Neon PostgreSQL serverless driver

### Payments Package (`packages/payments`)

Stripe integration:
- Checkout session creation
- Subscription management
- Billing portal
- Webhook handling utilities

### Autonomous Package (`packages/autonomous`)

Self-developing AI infrastructure:
- Confidence engine for autonomous decisions
- Signal processing from multiple sources
- Trigger engine for automation
- Learning engine for pattern extraction

## Environment Configuration

| Variable | Purpose | Required |
|----------|---------|----------|
| `DATABASE_URL` | Neon PostgreSQL connection | Yes |
| `BETTER_AUTH_SECRET` | Auth session encryption | Yes |
| `BETTER_AUTH_URL` | Base URL for auth | Yes |
| `STRIPE_SECRET_KEY` | Stripe API access | Yes |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification | Yes |
| `POSTHOG_KEY` | Analytics | No |
| `RESEND_API_KEY` | Email sending | No |

## Deployment

The application deploys to Vercel with:
- Automatic preview deploys on PRs
- Production deploys on main branch
- Edge functions for middleware
- Serverless functions for API routes
