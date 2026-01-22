# Local Development Setup

Fast and seamless onboarding for the AI-Native Boilerplate.

## Quick Start (Recommended)

Get started in 3 commands with an instant database:

```bash
# 1. Install dependencies
bun install

# 2. Run setup (creates instant Neon database - no account needed!)
bun setup

# 3. Start development
bun dev
```

That's it! Your database is ready at `http://localhost:3000`.

> **Note:** The instant database expires in 72 hours. Run `npx get-db claim` to keep it permanently.

## Setup Modes

### Instant Database (Default)

```bash
bun setup
# or
bun setup --instagres
```

- **No account required** - database provisioned instantly via [neon.new](https://neon.new)
- Database seeded automatically with schema
- Perfect for quick prototyping and testing
- Database expires in 72 hours (claim to keep)

### Your Own Neon Database

```bash
bun setup --quick
```

- Uses your existing Neon account
- You provide the `DATABASE_URL`
- Persistent database
- Get a free database at [neon.tech](https://neon.tech)

### Full Local (Docker)

```bash
bun setup --local
```

- PostgreSQL 16 via Docker
- Mailpit for local email testing
- Completely offline development
- Requires Docker Desktop

### CI Mode

```bash
bun setup --ci
```

- Non-interactive, uses environment variables
- Minimal setup for CI/CD pipelines

## Prerequisites

| Tool | Version | Required | Install |
|------|---------|----------|---------|
| Bun | >= 1.1.38 | Yes | [bun.sh](https://bun.sh) |
| Node.js | >= 20.0.0 | Yes | [nodejs.org](https://nodejs.org) |
| Docker | >= 24.0.0 | For `--local` | [docker.com](https://docker.com) |
| Stripe CLI | >= 1.0.0 | Optional | [stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli) |

## Environment Variables

After running `bun setup`, your `.env.local` will contain:

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Auth session secret (auto-generated) |
| `BETTER_AUTH_URL` | App URL for auth callbacks |

### Optional Services

| Variable | Service | Get Keys |
|----------|---------|----------|
| `STRIPE_SECRET_KEY` | Payments | [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhooks | Stripe Dashboard → Webhooks |
| `RESEND_API_KEY` | Email | [resend.com/api-keys](https://resend.com/api-keys) |
| `NEXT_PUBLIC_POSTHOG_KEY` | Analytics | [posthog.com](https://posthog.com) |
| `SENTRY_DSN` | Error tracking | [sentry.io](https://sentry.io) |

## Docker Services

When using `--local` mode:

```bash
# Start services
bun docker:up

# View logs
bun docker:logs

# Stop services
bun docker:down
```

### Services Available

| Service | Port | Description |
|---------|------|-------------|
| PostgreSQL | 5432 | Database |
| Mailpit Web UI | 8025 | Email testing inbox |
| Mailpit SMTP | 1025 | Email sending |

### Stripe Webhook Testing

Enable Stripe CLI container for webhook forwarding:

```bash
docker compose -f docker-compose.local.yml --profile stripe up -d
```

Or use the Stripe CLI directly:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Verification

After setup, verify everything works:

```bash
bun verify
```

This checks:
- Environment variables are set
- Database connection works
- Services are reachable
- TypeScript compiles
- Lint passes

## Scripts Reference

| Script | Description |
|--------|-------------|
| `bun setup` | Interactive setup wizard |
| `bun setup --instagres` | Instant database (default) |
| `bun setup --quick` | Your own Neon database |
| `bun setup --local` | Docker-based local dev |
| `bun verify` | Verify setup is working |
| `bun dev` | Start development server |
| `bun docker:up` | Start Docker services |
| `bun docker:down` | Stop Docker services |
| `bun docker:logs` | View Docker logs |

## Troubleshooting

### Database Connection Failed

**Instant Database (Instagres):**
```bash
# Check if database URL is set
grep DATABASE_URL .env.local

# Re-provision database
rm .env.local
bun setup
```

**Local Docker:**
```bash
# Check if Docker is running
docker info

# Check if containers are running
docker ps

# Restart containers
bun docker:down && bun docker:up

# Check logs
bun docker:logs
```

### Stripe Webhooks Not Working

1. Ensure webhook secret is set in `.env.local`
2. Start Stripe CLI listener:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
3. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### Email Not Sending (Local)

When using Docker local mode:
1. Emails go to Mailpit, not real addresses
2. View emails at [http://localhost:8025](http://localhost:8025)
3. Check Mailpit is running: `docker ps | grep mailpit`

### TypeScript Errors

```bash
# Check for errors
bun typecheck

# Common fix: rebuild packages
bun run build
```

### Pre-commit Hook Failing

```bash
# Fix lint issues
bun lint:fix

# Skip hooks if needed (not recommended)
git commit --no-verify
```

## Claiming Your Instant Database

If you used `bun setup` (instagres mode), your database expires in 72 hours.

To keep it permanently:

```bash
npx get-db claim
```

This opens your browser to claim the database to your Neon account (free tier available).

## FAQ

**Q: Can I switch from instant database to my own Neon account?**

Yes! Update `DATABASE_URL` in `.env.local` with your Neon connection string, then run `bun db:push` to sync the schema.

**Q: How do I reset the database?**

```bash
# For instant database
rm .env.local
bun setup

# For local Docker
bun docker:down
docker volume rm ainative_postgres_data
bun docker:up
bun db:push
```

**Q: Can I use a different database?**

The boilerplate is optimized for Neon's serverless PostgreSQL with Drizzle ORM. Other PostgreSQL providers should work by changing `DATABASE_URL`, but Neon-specific features (branching, instant databases) won't be available.

**Q: How do I add more environment variables?**

1. Add to `.env.example` for documentation
2. Add to `src/lib/env.ts` for Zod validation
3. Add to `turbo.json` globalEnv if needed in build
