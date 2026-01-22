# Production Deployment

This guide covers deploying the application to production, including Vercel setup, environment configuration, database migrations, and monitoring.

## Deployment Overview

The recommended production stack:

| Component | Service | Why |
|-----------|---------|-----|
| **Hosting** | Vercel | Zero-config Next.js, edge functions, preview deploys |
| **Database** | Neon | Serverless PostgreSQL, autoscaling, branching |
| **CDN** | Vercel Edge | Global distribution, automatic caching |
| **Monitoring** | Sentry + PostHog | Errors + product analytics |

## Vercel Deployment

### First-Time Setup

#### 1. Connect Repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Select the `apps/web` directory as the root
4. Configure build settings:

```
Framework Preset: Next.js
Root Directory: apps/web
Build Command: cd ../.. && bun run build --filter web
Output Directory: .next
Install Command: bun install
```

#### 2. Set Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

**Required:**

| Variable | Value | Environment |
|----------|-------|-------------|
| `DATABASE_URL` | `postgresql://...` | Production, Preview |
| `BETTER_AUTH_SECRET` | `<random-32-chars>` | Production, Preview |
| `BETTER_AUTH_URL` | `https://yourdomain.com` | Production |
| `NEXT_PUBLIC_APP_URL` | `https://yourdomain.com` | Production |

**For Preview Deployments:**

| Variable | Value |
|----------|-------|
| `BETTER_AUTH_URL` | `https://${VERCEL_URL}` |
| `NEXT_PUBLIC_APP_URL` | `https://${VERCEL_URL}` |

**Optional (enable as needed):**

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhooks |
| `RESEND_API_KEY` | Transactional email |
| `NEXT_PUBLIC_POSTHOG_KEY` | Analytics |
| `SENTRY_DSN` | Error tracking |
| `SENTRY_AUTH_TOKEN` | Source map uploads |

#### 3. Deploy

```bash
# First deploy via CLI
vercel --prod

# Or push to main branch (auto-deploys)
git push origin main
```

### Automatic Deployments

The repository is configured for:

- **Production**: Auto-deploy on push to `main`
- **Preview**: Auto-deploy on pull requests

Preview URLs are commented on PRs automatically.

### Manual Deployment

```bash
# Deploy to production
vercel --prod

# Deploy preview
vercel

# Deploy with specific environment
vercel --env production
```

## Database Migration Strategy

### Development → Production Flow

```
1. Develop with `bun db:push` (local)
2. Generate migration: `bun db:generate`
3. Test migration on Neon branch
4. Apply to production: `bun db:migrate`
5. Deploy application
```

### Pre-Deployment Checklist

```bash
# 1. Ensure migrations are generated
ls drizzle/migrations/

# 2. Review pending migrations
cat drizzle/migrations/[latest]_*.sql

# 3. Run migrations on production
DATABASE_URL=$PRODUCTION_DB_URL bun db:migrate
```

### Rollback Strategy

If a migration fails:

1. **Revert application** to previous version in Vercel
2. **Apply rollback migration** (if you have one)
3. **Fix the issue** and redeploy

For complex rollbacks, use Neon's point-in-time recovery:

```bash
# Restore to specific time
npx neonctl branches restore --timestamp "2024-01-15T10:00:00Z"
```

## Production Configuration

### Environment Validation

The app validates environment variables at build time. Missing required variables cause build failures.

```typescript
// apps/web/src/lib/env.ts
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  // Skip validation for optional services
  STRIPE_SECRET_KEY: z.string().optional(),
});
```

### Build Optimization

`next.config.ts` is pre-configured for production:

```typescript
const config = {
  // Enable React strict mode
  reactStrictMode: true,

  // Standalone output for Docker
  output: 'standalone',

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};
```

### Caching Strategy

The app uses multiple cache layers:

| Layer | What | TTL |
|-------|------|-----|
| **CDN** | Static assets | 1 year |
| **Edge** | HTML pages | Varies by route |
| **Data** | API responses | Per-endpoint |

Configure caching in route handlers:

```typescript
// Cache for 60 seconds
export const revalidate = 60;

// Or dynamic caching
export async function GET() {
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
```

## Monitoring & Observability

### Sentry (Error Tracking)

Sentry is pre-configured in:
- `apps/web/sentry.client.config.ts`
- `apps/web/sentry.server.config.ts`
- `apps/web/sentry.edge.config.ts`

Set these environment variables:

```bash
SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=<for source maps>
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
```

#### Source Maps

Source maps are uploaded automatically during build:

```typescript
// next.config.ts
import { withSentryConfig } from '@sentry/nextjs';

export default withSentryConfig(config, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  hideSourceMaps: true,
});
```

### PostHog (Analytics)

PostHog provides:
- User analytics
- Feature flags
- Session replay
- A/B testing

Configure:

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

### Health Checks

The `/api/v1/health` endpoint provides system status:

```bash
curl https://yourdomain.com/api/v1/health
```

Response:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00Z",
  "database": "connected",
  "version": "1.0.0"
}
```

Monitor this endpoint with your uptime service.

## Scaling Considerations

### Database Connection Pooling

Neon handles connection pooling automatically. For high traffic:

```bash
# Use pooled connection string
DATABASE_URL=postgresql://...?pgbouncer=true
```

### Edge Functions

Move latency-sensitive routes to the edge:

```typescript
// app/api/fast/route.ts
export const runtime = 'edge';

export async function GET() {
  // Runs at edge location nearest to user
}
```

### Rate Limiting

The app includes built-in rate limiting:

```typescript
// Strict: 10 req/min (billing, checkout)
// Standard: 100 req/min (general API)
// Auth: 20 req/min (login, signup)
```

For production, consider additional protection:
- Vercel Edge Middleware
- Cloudflare Rate Limiting
- Custom Redis-based limiter

## Security Checklist

### Before Go-Live

- [ ] `BETTER_AUTH_SECRET` is random, 32+ characters
- [ ] `DATABASE_URL` uses SSL (`?sslmode=require`)
- [ ] No secrets in client-side code (`NEXT_PUBLIC_*`)
- [ ] CORS configured correctly
- [ ] CSP headers set in `next.config.ts`
- [ ] Rate limiting enabled
- [ ] Webhook signatures verified

### Ongoing

- [ ] Rotate secrets quarterly
- [ ] Monitor Sentry for security-related errors
- [ ] Keep dependencies updated
- [ ] Review access logs periodically

## Domain Setup

### Custom Domain

1. Go to Vercel Dashboard → Domains
2. Add your domain
3. Configure DNS:

```
Type  Name    Value
A     @       76.76.21.21
CNAME www     cname.vercel-dns.com
```

### SSL Certificates

Vercel provides automatic SSL. No configuration needed.

### Redirects

Configure in `vercel.json` or `next.config.ts`:

```typescript
// next.config.ts
const config = {
  async redirects() {
    return [
      {
        source: '/old-path',
        destination: '/new-path',
        permanent: true,
      },
    ];
  },
};
```

## Rollback Procedures

### Vercel Instant Rollback

1. Go to Vercel Dashboard → Deployments
2. Find the last working deployment
3. Click "..." → "Promote to Production"

Or via CLI:

```bash
# List deployments
vercel ls

# Rollback to specific deployment
vercel rollback <deployment-url>
```

### Database Rollback

For schema issues:

```bash
# 1. Identify the problematic migration
ls drizzle/migrations/

# 2. Create rollback migration
bun db:generate --name rollback-feature-x

# 3. Apply rollback
bun db:migrate
```

For data issues, use Neon's point-in-time recovery.

## Cost Optimization

### Vercel

- Use `serverless` functions instead of `edge` when latency isn't critical
- Enable caching to reduce function invocations
- Use ISR (Incremental Static Regeneration) for semi-static pages

### Neon

- Use connection pooling to reduce connections
- Consider read replicas for heavy read workloads
- Archive old data to reduce storage costs

### Monitoring

- Set up Sentry quotas to control event volume
- Use PostHog's sampling for high-traffic pages

## Disaster Recovery

### Backup Strategy

| Data | Backup Method | Frequency |
|------|---------------|-----------|
| Database | Neon automatic | Continuous |
| Code | Git | Every commit |
| Config | Version controlled | Every commit |
| Secrets | 1Password/Vault | On change |

### Recovery Time Objectives

| Scenario | RTO | Procedure |
|----------|-----|-----------|
| Bad deployment | < 5 min | Vercel rollback |
| Database corruption | < 1 hour | Neon PITR |
| Complete outage | < 4 hours | Full redeploy |

### Incident Response

1. **Detect**: Sentry alert or health check failure
2. **Assess**: Check logs, identify scope
3. **Mitigate**: Rollback if needed
4. **Resolve**: Fix root cause
5. **Review**: Post-incident analysis
