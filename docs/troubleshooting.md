# Troubleshooting

This guide covers common issues and their solutions. Search for your error message or browse by category.

## Setup Issues

### "bun: command not found"

**Problem**: Bun is not installed or not in PATH.

**Solution**:
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Reload shell
source ~/.bashrc  # or ~/.zshrc

# Verify
bun --version
```

### "Database connection failed" during setup

**Problem**: Can't connect to database during `bun setup`.

**Solutions**:

1. **Instant database (Instagres)**:
   ```bash
   # May have expired (72-hour limit)
   rm .env.local
   bun setup
   ```

2. **Network issues**:
   ```bash
   # Check internet connection
   curl -I https://neon.tech
   ```

3. **Neon database**:
   - Verify DATABASE_URL format: `postgresql://user:pass@host/db?sslmode=require`
   - Check Neon dashboard for project status
   - Ensure SSL mode is enabled

### "BETTER_AUTH_SECRET must be at least 32 characters"

**Problem**: Auth secret is too short.

**Solution**:
```bash
# Generate new secret
openssl rand -base64 32

# Update .env.local
BETTER_AUTH_SECRET=<paste-the-output>
```

### "Module not found" after installation

**Problem**: Dependencies not installed correctly.

**Solution**:
```bash
# Clean install
rm -rf node_modules
rm bun.lockb
bun install

# Rebuild packages
bun build
```

## Development Issues

### Port 3000 already in use

**Problem**: Another process is using port 3000.

**Solution**:
```bash
# Find the process
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use different port
PORT=3001 bun dev
```

### "TypeError: fetch failed" in development

**Problem**: API route can't reach external service.

**Solutions**:

1. **Check environment variables**:
   ```bash
   grep STRIPE .env.local
   grep RESEND .env.local
   ```

2. **Verify service is configured**:
   - Missing API keys cause graceful degradation
   - Check console for specific error messages

3. **Network issues**:
   ```bash
   # Test connectivity
   curl https://api.stripe.com
   ```

### Hot reload not working

**Problem**: Changes aren't reflected in browser.

**Solutions**:

1. **Clear Next.js cache**:
   ```bash
   rm -rf apps/web/.next
   bun dev
   ```

2. **Check for syntax errors**:
   ```bash
   bun typecheck
   ```

3. **Restart dev server**:
   ```bash
   # Ctrl+C to stop
   bun dev
   ```

### "Cannot find module '@repo/...' "

**Problem**: Internal package not built.

**Solution**:
```bash
# Build all packages
bun build

# Or specific package
bun build --filter @repo/database
```

## Database Issues

### "relation does not exist"

**Problem**: Database schema doesn't match code.

**Solution**:
```bash
# Push schema to database
bun db:push

# Or run migrations
bun db:migrate
```

### "connection refused" to database

**Problem**: Can't connect to database.

**Solutions**:

1. **Local Docker**:
   ```bash
   # Check if running
   docker ps | grep postgres

   # Start if needed
   bun docker:up
   ```

2. **Neon**:
   - Check Neon dashboard for project status
   - Verify IP isn't blocked
   - Ensure SSL is enabled in connection string

### "too many connections"

**Problem**: Connection pool exhausted.

**Solutions**:

1. **Use pooled connection**:
   ```bash
   DATABASE_URL=postgresql://...?pgbouncer=true
   ```

2. **Reduce concurrent requests** in development

3. **Check for connection leaks** in code

### Migration failed

**Problem**: Migration error during `bun db:migrate`.

**Solutions**:

1. **Review migration file**:
   ```bash
   cat drizzle/migrations/[latest]_*.sql
   ```

2. **Check for conflicts**:
   ```bash
   # See current schema
   bun db:studio
   ```

3. **Reset if in development**:
   ```bash
   bun db:push --force
   ```

## Authentication Issues

### "Session not found" after login

**Problem**: Session isn't persisting.

**Solutions**:

1. **Check cookie settings**:
   - Cookies require HTTPS in production
   - Ensure `BETTER_AUTH_URL` matches your domain

2. **Verify auth secret**:
   ```bash
   echo $BETTER_AUTH_SECRET | wc -c  # Should be 32+
   ```

3. **Clear browser cookies** and try again

### OAuth callback error

**Problem**: OAuth redirect fails.

**Solutions**:

1. **Check callback URL** matches provider settings:
   ```
   https://yourdomain.com/api/auth/callback/github
   https://yourdomain.com/api/auth/callback/google
   ```

2. **Verify credentials**:
   ```bash
   grep GITHUB .env.local
   grep GOOGLE .env.local
   ```

3. **Check provider dashboard** for errors

### "Invalid credentials" on valid login

**Problem**: Password verification failing.

**Solutions**:

1. **Check database** for user record:
   ```bash
   bun db:studio
   # Look in users table
   ```

2. **Reset password** via forgot password flow

3. **Check password hashing** algorithm matches

## Payment Issues

### Stripe webhook not receiving events

**Problem**: Webhook endpoint not triggered.

**Solutions**:

1. **Local development**:
   ```bash
   # Start Stripe CLI
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

2. **Production**:
   - Check webhook URL in Stripe dashboard
   - Verify signing secret matches `STRIPE_WEBHOOK_SECRET`
   - Check Stripe dashboard → Developers → Webhooks → Recent events

### "No such price" error

**Problem**: Price ID doesn't exist.

**Solutions**:

1. **Verify price IDs** in Stripe dashboard
2. **Check test vs live mode** - IDs are different
3. **Update config**:
   ```typescript
   // apps/web/src/lib/stripe/config.ts
   export const PLANS = {
     pro: { priceId: 'price_xxx' },  // Update this
   };
   ```

### Checkout session fails to create

**Problem**: `stripe.checkout.sessions.create` throws error.

**Solutions**:

1. **Check API key mode**:
   - `sk_test_` for development
   - `sk_live_` for production

2. **Verify required fields**:
   ```typescript
   {
     success_url: 'https://...',  // Required
     cancel_url: 'https://...',   // Required
     line_items: [...]            // Required
   }
   ```

## Build Issues

### TypeScript errors on build

**Problem**: Build fails with type errors.

**Solution**:
```bash
# Find all errors
bun typecheck

# Common fixes:
# - Add missing type imports
# - Fix implicit any
# - Update return types
```

### "Out of memory" during build

**Problem**: Build process runs out of memory.

**Solutions**:

1. **Increase Node memory**:
   ```bash
   NODE_OPTIONS="--max-old-space-size=8192" bun build
   ```

2. **Build packages separately**:
   ```bash
   bun build --filter @repo/database
   bun build --filter web
   ```

### Biome lint errors

**Problem**: `bun lint` reports errors.

**Solution**:
```bash
# Auto-fix what's possible
bun lint:fix

# Manual fixes for remaining issues
# Check error messages for specific rules
```

## Testing Issues

### Tests fail with "Cannot find module"

**Problem**: Test can't import module.

**Solutions**:

1. **Check vitest config**:
   ```typescript
   // vitest.config.ts
   resolve: {
     alias: {
       '@': path.resolve(__dirname, './src'),
     },
   },
   ```

2. **Build packages first**:
   ```bash
   bun build
   bun test
   ```

### E2E tests timeout

**Problem**: Playwright tests hang.

**Solutions**:

1. **Increase timeout**:
   ```typescript
   // playwright.config.ts
   timeout: 60000,  // 60 seconds
   ```

2. **Check app is running**:
   ```bash
   # In separate terminal
   bun dev

   # Then run tests
   bun test:e2e
   ```

3. **Debug visually**:
   ```bash
   bunx playwright test --ui
   ```

### Mock not working

**Problem**: Mock function not called.

**Solution**:
```typescript
// Ensure mock is set up before import
const mockFn = vi.fn();
vi.mock('@/lib/auth', () => ({
  getSession: mockFn,
}));

// Import AFTER mock setup
const { GET } = await import('./route');
```

## Deployment Issues

### Vercel build fails

**Problem**: Build succeeds locally but fails on Vercel.

**Solutions**:

1. **Check environment variables** in Vercel dashboard

2. **Compare Node versions**:
   ```bash
   node --version  # Local
   # Check Vercel → Settings → General → Node.js Version
   ```

3. **Check build logs** in Vercel dashboard

### Preview deploy shows wrong URL

**Problem**: Auth redirects to wrong domain.

**Solution**:

Set dynamic auth URL in Vercel:
```
BETTER_AUTH_URL = https://${VERCEL_URL}
```

### "Function Timeout" in production

**Problem**: API route times out.

**Solutions**:

1. **Optimize database queries**
2. **Add indexes** to frequently queried columns
3. **Use edge runtime** for latency-sensitive routes:
   ```typescript
   export const runtime = 'edge';
   ```
4. **Increase timeout** (Vercel Pro required for >10s)

## CI/CD Issues

### GitHub Action fails with secret error

**Problem**: "Error: Input required and not supplied"

**Solution**:
1. Go to Settings → Secrets → Actions
2. Verify secret name matches workflow
3. Check secret is available for the branch

### Codecov upload fails

**Problem**: Coverage report not uploaded.

**Solutions**:

1. **Verify token**:
   ```yaml
   - uses: codecov/codecov-action@v4
     with:
       token: ${{ secrets.CODECOV_TOKEN }}
   ```

2. **Check file path**:
   ```yaml
   files: ./apps/web/coverage/lcov.info
   ```

### Deploy preview not commented on PR

**Problem**: Bot doesn't comment preview URL.

**Solution**:

Check workflow has correct permissions:
```yaml
permissions:
  pull-requests: write
```

## Performance Issues

### Slow page loads

**Problem**: Pages take long to load.

**Solutions**:

1. **Check database queries**:
   ```typescript
   console.time('query');
   const result = await db.query...
   console.timeEnd('query');
   ```

2. **Enable caching**:
   ```typescript
   export const revalidate = 60;  // Cache for 60s
   ```

3. **Analyze bundle**:
   ```bash
   ANALYZE=true bun build
   ```

### Memory leaks

**Problem**: Process memory grows over time.

**Solutions**:

1. **Check for unclosed connections**
2. **Use `await` on all async operations**
3. **Profile with Node inspector**:
   ```bash
   NODE_OPTIONS='--inspect' bun dev
   ```

## Getting Help

If your issue isn't covered:

1. **Search existing issues**: [GitHub Issues](https://github.com/yourusername/ai-native-boilerplate/issues)

2. **Check documentation**:
   - [Getting Started](./getting-started.md)
   - [Operations](./operations.md)
   - [Production](./production.md)

3. **Open an issue** with:
   - Error message (full stack trace)
   - Steps to reproduce
   - Environment (OS, Bun version, Node version)
   - Relevant config files (sanitize secrets!)

4. **Ask Claude Code**:
   ```
   /analyze this error: <paste error>
   ```
