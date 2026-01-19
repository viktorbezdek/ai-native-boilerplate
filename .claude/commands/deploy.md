# /deploy $ENVIRONMENT

Deploy to specified environment with verification.

## Arguments
- `$ENVIRONMENT`: Target environment (preview | staging | production)

## Pre-flight Checks
1. Ensure all tests pass
2. Verify build succeeds locally
3. Check for uncommitted changes
4. Validate environment variables exist

## Execution

### For Preview
```bash
bunx vercel --build-env NEXT_PUBLIC_ENV=preview
```

### For Staging
```bash
bunx vercel --build-env NEXT_PUBLIC_ENV=staging --target preview
```

### For Production
**REQUIRES HUMAN APPROVAL**
```bash
bunx vercel --prod --build-env NEXT_PUBLIC_ENV=production
```

## Post-Deploy
1. Wait for deployment URL
2. Run smoke tests against new deployment
3. Verify Sentry release tracking
4. Report deployment status

## Output Format
```
## Deployment: $ENVIRONMENT

**URL**: [deployment-url]
**Status**: Success | Failed
**Duration**: Xm Xs
**Commit**: [sha] - [message]

### Smoke Tests
- [ ] Homepage loads
- [ ] Auth flow works
- [ ] API health check passes

### Issues Found
[List any issues or "None"]
```
