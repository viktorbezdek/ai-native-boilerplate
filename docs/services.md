# Third-Party Services

This guide covers configuring all third-party services used by the boilerplate: database, authentication, payments, email, analytics, and error tracking.

## Service Overview

| Service | Purpose | Required | Free Tier |
|---------|---------|----------|-----------|
| **Neon** | PostgreSQL database | Yes | 0.5 GB storage |
| **Better Auth** | Authentication | Yes | N/A (self-hosted) |
| **Stripe** | Payments | No | Test mode free |
| **Resend** | Transactional email | No | 3,000 emails/month |
| **PostHog** | Product analytics | No | 1M events/month |
| **Sentry** | Error tracking | No | 5K errors/month |
| **Vercel** | Hosting | No | Generous free tier |

## Neon (Database)

### Getting Started

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string

### Connection String

```bash
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### Configuration Options

#### Connection Pooling

For serverless environments, use the pooled connection:

```bash
# Direct connection (migrations, Drizzle Studio)
DATABASE_URL=postgresql://...?sslmode=require

# Pooled connection (application)
DATABASE_URL=postgresql://...?sslmode=require&pgbouncer=true
```

#### Database Branching

Create branches for testing:

```bash
# Install Neon CLI
npm install -g neonctl

# Authenticate
neonctl auth

# Create branch
neonctl branches create --name feature-test

# List branches
neonctl branches list

# Delete branch
neonctl branches delete feature-test
```

### Instant Database (Development)

For quick development, use the instant database:

```bash
bun setup  # Provisions automatically
```

Claim it to your account before 72-hour expiration:

```bash
bun db:claim
```

## Stripe (Payments)

### Getting API Keys

1. Go to [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
2. Copy keys to `.env.local`:

```bash
# Test mode keys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Webhook Configuration

#### Local Development

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook signing secret:

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Production

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the signing secret to Vercel environment variables

### Products and Prices

Create products in Stripe Dashboard:

1. Go to Products → Add product
2. Create pricing tiers:

```
Free:     $0/month
Pro:      $19/month
Business: $49/month
```

3. Copy price IDs to your config:

```typescript
// apps/web/src/lib/stripe/config.ts
export const PLANS = {
  free: { priceId: null },
  pro: { priceId: 'price_xxx' },
  business: { priceId: 'price_yyy' },
};
```

### Testing Payments

Use Stripe's test cards:

| Card | Behavior |
|------|----------|
| `4242 4242 4242 4242` | Succeeds |
| `4000 0000 0000 0002` | Declined |
| `4000 0000 0000 3220` | Requires 3D Secure |

Always use future expiration dates and any CVC.

## Resend (Email)

### Getting API Key

1. Sign up at [resend.com](https://resend.com)
2. Go to API Keys → Create API Key
3. Add to `.env.local`:

```bash
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Your App Name
```

### Domain Verification

For production, verify your domain:

1. Go to Resend Dashboard → Domains
2. Add your domain
3. Add DNS records:

```
Type  Name                      Value
TXT   @                         resend-verification=...
MX    send.yourdomain.com       feedback-smtp.us-east-1.amazonses.com
TXT   send.yourdomain.com       v=spf1 include:amazonses.com ~all
```

### Email Templates

Templates are in `apps/web/emails/`:

```
emails/
├── welcome.tsx
├── password-reset.tsx
└── subscription-confirmation.tsx
```

Example template:

```tsx
// emails/welcome.tsx
import { Html, Text, Link } from '@react-email/components';

export function WelcomeEmail({ name }: { name: string }) {
  return (
    <Html>
      <Text>Welcome to our app, {name}!</Text>
      <Link href="https://yourdomain.com/dashboard">
        Go to Dashboard
      </Link>
    </Html>
  );
}
```

### Sending Emails

```typescript
import { Resend } from 'resend';
import { WelcomeEmail } from '@/emails/welcome';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: process.env.FROM_EMAIL,
  to: user.email,
  subject: 'Welcome!',
  react: WelcomeEmail({ name: user.name }),
});
```

### Local Development (Mailpit)

When using `bun setup --local`, emails go to Mailpit:

- **Inbox**: [http://localhost:8025](http://localhost:8025)
- **SMTP**: `localhost:1025`

## PostHog (Analytics)

### Getting Started

1. Sign up at [posthog.com](https://posthog.com)
2. Create a project
3. Copy your project API key:

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

### Tracking Events

Client-side:

```typescript
import posthog from 'posthog-js';

// Track event
posthog.capture('button_clicked', {
  button_name: 'signup',
  page: '/pricing',
});

// Identify user
posthog.identify(user.id, {
  email: user.email,
  plan: user.subscription?.plan,
});
```

Server-side:

```typescript
import { PostHog } from 'posthog-node';

const posthog = new PostHog(process.env.POSTHOG_API_KEY);

posthog.capture({
  distinctId: user.id,
  event: 'subscription_created',
  properties: {
    plan: 'pro',
    price: 1900,
  },
});
```

### Feature Flags

Create flags in PostHog Dashboard → Feature Flags:

```typescript
// Check flag
const isEnabled = posthog.isFeatureEnabled('new-dashboard');

// Get flag value
const variant = posthog.getFeatureFlag('pricing-experiment');
```

### Session Replay

Enable in PostHog Dashboard → Session Recording.

Configure in your app:

```typescript
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
  session_recording: {
    recordCrossOriginIframes: true,
  },
});
```

## Sentry (Error Tracking)

### Getting Started

1. Sign up at [sentry.io](https://sentry.io)
2. Create a Next.js project
3. Copy the DSN:

```bash
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

### Source Maps (Production)

For readable stack traces, upload source maps:

1. Create an auth token at [sentry.io/settings/auth-tokens](https://sentry.io/settings/auth-tokens)
2. Add to `.env.local` and Vercel:

```bash
SENTRY_AUTH_TOKEN=...
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
```

Source maps are uploaded automatically during build.

### Configuration Files

The boilerplate includes pre-configured Sentry:

```
apps/web/
├── sentry.client.config.ts   # Browser errors
├── sentry.server.config.ts   # Server errors
└── sentry.edge.config.ts     # Edge function errors
```

### Custom Error Handling

```typescript
import * as Sentry from '@sentry/nextjs';

// Capture exception
Sentry.captureException(error);

// Capture message
Sentry.captureMessage('Something went wrong');

// Add context
Sentry.setUser({ id: user.id, email: user.email });
Sentry.setTag('feature', 'checkout');
```

### Performance Monitoring

Enable in Sentry config:

```typescript
// sentry.client.config.ts
Sentry.init({
  tracesSampleRate: 0.1, // 10% of transactions
  profilesSampleRate: 0.1,
});
```

## Vercel (Hosting)

### Getting Started

1. Sign up at [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Configure settings (see [Production Guide](./production.md))

### Environment Variables

Set in Vercel Dashboard → Settings → Environment Variables:

- **Production**: Only for production deployments
- **Preview**: For PR preview deployments
- **Development**: For `vercel dev` locally

### CLI Usage

```bash
# Install Vercel CLI
npm i -g vercel

# Link project
vercel link

# Deploy preview
vercel

# Deploy production
vercel --prod

# Pull environment variables
vercel env pull
```

### Tokens for CI/CD

1. Go to [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Create a new token
3. Add to GitHub Secrets as `VERCEL_TOKEN`

## OAuth Providers

### GitHub OAuth

1. Go to [github.com/settings/developers](https://github.com/settings/developers)
2. New OAuth App:
   - **Homepage URL**: `https://yourdomain.com`
   - **Callback URL**: `https://yourdomain.com/api/auth/callback/github`
3. Copy credentials:

```bash
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

### Google OAuth

1. Go to [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID:
   - **Authorized JavaScript origins**: `https://yourdomain.com`
   - **Authorized redirect URIs**: `https://yourdomain.com/api/auth/callback/google`
3. Copy credentials:

```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

## Service Health Monitoring

### Checking Service Status

```typescript
// apps/web/src/app/api/v1/health/route.ts
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    stripe: await checkStripe(),
    resend: await checkResend(),
  };

  const healthy = Object.values(checks).every(c => c.status === 'ok');

  return Response.json({
    status: healthy ? 'healthy' : 'degraded',
    checks,
  });
}
```

### Status Pages

Subscribe to status pages for proactive alerts:

- Neon: [neonstatus.com](https://neonstatus.com)
- Stripe: [status.stripe.com](https://status.stripe.com)
- Vercel: [vercel-status.com](https://vercel-status.com)
- Resend: [status.resend.com](https://status.resend.com)
- PostHog: [status.posthog.com](https://status.posthog.com)
- Sentry: [status.sentry.io](https://status.sentry.io)

## Cost Estimation

### Free Tier Limits

| Service | Free Tier | Estimated Cost After |
|---------|-----------|---------------------|
| Neon | 0.5 GB, 1 project | $19/mo (Pro) |
| Stripe | Test mode free | 2.9% + $0.30/transaction |
| Resend | 3,000 emails/mo | $20/mo (5,000 emails) |
| PostHog | 1M events/mo | $0.00031/event |
| Sentry | 5K errors/mo | $26/mo (50K errors) |
| Vercel | 100 GB bandwidth | $20/mo (Pro) |

### Monthly Cost Examples

**Early Stage (< 1,000 users)**:
- All services: $0 (free tiers)

**Growth (1,000-10,000 users)**:
- Neon Pro: $19
- Vercel Pro: $20
- PostHog: ~$20
- Total: ~$60/mo

**Scale (10,000+ users)**:
- Neon Scale: $69+
- Vercel Pro: $20+
- PostHog: $100+
- Sentry: $50+
- Total: $250+/mo
