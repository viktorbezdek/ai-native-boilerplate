# GitHub CI/CD Configuration

This guide covers setting up GitHub Actions for continuous integration and deployment. By the end, you'll have automated testing on every PR and automatic deployments to Vercel.

## Overview

The boilerplate includes three workflows:

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| **CI** | `ci.yml` | Push, PR | Lint, typecheck, test, build |
| **Deploy** | `deploy.yml` | Push to main, PR | Preview and production deploys |
| **Release** | `release.yml` | Manual | Version bumps and releases |

## Quick Setup Checklist

1. [ ] Fork/clone the repository
2. [ ] Add required secrets to GitHub
3. [ ] Configure Vercel project
4. [ ] Enable branch protection
5. [ ] Test with a PR

## Step 1: GitHub Secrets

Go to your repository → Settings → Secrets and variables → Actions → New repository secret.

### Required Secrets

| Secret | Purpose | How to Get |
|--------|---------|------------|
| `DATABASE_URL` | Test database connection | Neon connection string |
| `BETTER_AUTH_SECRET` | Auth encryption | `openssl rand -base64 32` |
| `VERCEL_TOKEN` | Deploy to Vercel | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Vercel organization | See below |
| `VERCEL_PROJECT_ID` | Vercel project | See below |

### Getting Vercel IDs

```bash
# Link your project first
cd ai-native-boilerplate
vercel link

# IDs are stored in .vercel/project.json
cat .vercel/project.json
```

Output:

```json
{
  "orgId": "team_xxx",
  "projectId": "prj_yyy"
}
```

Add these as secrets:
- `VERCEL_ORG_ID` = `team_xxx`
- `VERCEL_PROJECT_ID` = `prj_yyy`

### Optional Secrets

| Secret | Purpose | When Needed |
|--------|---------|-------------|
| `TURBO_TOKEN` | Remote caching | For faster CI builds |
| `CODECOV_TOKEN` | Coverage reports | For coverage badges |
| `STRIPE_SECRET_KEY` | Payment tests | If testing Stripe integration |

### Repository Variables

Go to Settings → Secrets and variables → Actions → Variables tab.

| Variable | Value | Purpose |
|----------|-------|---------|
| `TURBO_TEAM` | Your team name | Turbo remote caching |

## Step 2: Workflow Configuration

### CI Workflow (`ci.yml`)

The CI workflow runs on every push and PR:

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  BUN_VERSION: "1.1.38"
  NODE_VERSION: "20"
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ vars.TURBO_TEAM }}

jobs:
  lint:
    name: Lint & Format
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive  # Required for claude-mem submodule
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: ${{ env.BUN_VERSION }}
      - run: bun install --frozen-lockfile
      - run: bun run lint
      - run: bun run format:check

  typecheck:
    name: Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: ${{ env.BUN_VERSION }}
      - run: bun install --frozen-lockfile
      - run: bun run typecheck

  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: ${{ env.BUN_VERSION }}
      - run: bun install --frozen-lockfile
      - run: bun run test
        env:
          CI: true
      - uses: codecov/codecov-action@v4
        with:
          files: ./apps/web/coverage/lcov.info
          token: ${{ secrets.CODECOV_TOKEN }}

  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      BETTER_AUTH_SECRET: ${{ secrets.BETTER_AUTH_SECRET }}
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: ${{ env.BUN_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      - run: bun install --frozen-lockfile
      - run: bunx playwright install --with-deps chromium
      - run: bun run build
      - run: bun run test:e2e
        env:
          CI: true
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: apps/web/playwright-report/
          retention-days: 7

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint, typecheck, unit-tests]
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: ${{ env.BUN_VERSION }}
      - run: bun install --frozen-lockfile
      - run: bun run build
        env:
          SKIP_ENV_VALIDATION: true
```

### Deploy Workflow (`deploy.yml`)

Handles preview and production deployments:

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'preview'
        type: choice
        options:
          - preview
          - production

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  deploy-preview:
    name: Deploy Preview
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    environment:
      name: preview
      url: ${{ steps.deploy.outputs.url }}
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: "1.1.38"
      - run: bun add -g vercel@latest
      - run: vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}
      - run: vercel build --token=${{ secrets.VERCEL_TOKEN }}
      - id: deploy
        run: |
          url=$(vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }})
          echo "url=$url" >> $GITHUB_OUTPUT
      - name: Comment PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `🚀 **Preview deployed!**\n\n🔗 ${process.env.PREVIEW_URL}`
            })
        env:
          PREVIEW_URL: ${{ steps.deploy.outputs.url }}

  deploy-production:
    name: Deploy Production
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://yourdomain.com
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: "1.1.38"
      - run: bun add -g vercel@latest
      - run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
      - run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
      - run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}

  smoke-test:
    name: Smoke Test
    runs-on: ubuntu-latest
    needs: deploy-production
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - run: sleep 30
      - name: Health check
        run: |
          response=$(curl -s -o /dev/null -w "%{http_code}" https://yourdomain.com/api/v1/health)
          if [ "$response" != "200" ]; then
            echo "Health check failed: $response"
            exit 1
          fi
```

### Release Workflow (`release.yml`)

Manual workflow for creating releases:

```yaml
# .github/workflows/release.yml
name: Release

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version bump type'
        required: true
        default: 'patch'
        type: choice
        options:
          - patch
          - minor
          - major

permissions:
  contents: write
  pull-requests: write

jobs:
  release:
    name: Create Release
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}
      - uses: oven-sh/setup-bun@v2
      - name: Configure Git
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
      - name: Bump version
        id: version
        run: |
          current=$(jq -r '.version' package.json)
          # ... version calculation logic ...
          echo "new=$new_version" >> $GITHUB_OUTPUT
      - name: Update package.json
        run: jq '.version = "${{ steps.version.outputs.new }}"' package.json > tmp.json && mv tmp.json package.json
      - name: Commit and tag
        run: |
          git add package.json
          git commit -m "chore: bump version to ${{ steps.version.outputs.new }}"
          git push
          git tag -a "v${{ steps.version.outputs.new }}" -m "Release v${{ steps.version.outputs.new }}"
          git push origin "v${{ steps.version.outputs.new }}"
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: v${{ steps.version.outputs.new }}
          generate_release_notes: true
```

## Step 3: Branch Protection

Go to repository Settings → Branches → Add rule.

### Main Branch Protection

**Branch name pattern**: `main`

**Settings**:
- [x] Require a pull request before merging
  - [x] Require approvals: 1
- [x] Require status checks to pass before merging
  - [x] Require branches to be up to date
  - Status checks:
    - `Lint & Format`
    - `Type Check`
    - `Unit Tests`
    - `Build`
- [x] Require conversation resolution before merging
- [x] Do not allow bypassing the above settings

### Develop Branch Protection (Optional)

For a develop branch workflow:

**Branch name pattern**: `develop`

**Settings**:
- [x] Require status checks to pass
- [ ] Require approvals (optional for develop)

## Step 4: Turbo Remote Caching (Optional)

Speed up CI with Turbo's remote cache.

### Setup

1. Create account at [vercel.com](https://vercel.com)
2. Link Turbo:

```bash
bunx turbo login
bunx turbo link
```

3. Get token:

```bash
# Copy token from output
bunx turbo link
```

4. Add secrets to GitHub:
   - `TURBO_TOKEN`: Your Turbo token
   - `TURBO_TEAM` (variable): Your team name

### Benefits

- **First run**: ~3 minutes
- **Cached run**: ~30 seconds

## Step 5: Test Database Setup

### Option A: Dedicated CI Database

Create a separate Neon database for CI:

1. Go to Neon Dashboard
2. Create new project named `your-app-ci`
3. Copy connection string to `DATABASE_URL` secret

### Option B: Database Branching

Use Neon branching for isolated test databases:

```yaml
# In CI workflow
- name: Create test branch
  run: |
    npx neonctl branches create --name ci-${{ github.run_id }}
    echo "DATABASE_URL=$(npx neonctl branches get ci-${{ github.run_id }} --output connectionString)" >> $GITHUB_ENV

- name: Run tests
  run: bun test

- name: Cleanup branch
  if: always()
  run: npx neonctl branches delete ci-${{ github.run_id }}
```

### Option C: In-Memory Database

For unit tests that don't need persistence:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    },
  },
});
```

## Step 6: Coverage Reporting

### Codecov Setup

1. Sign up at [codecov.io](https://codecov.io)
2. Add repository
3. Copy token to `CODECOV_TOKEN` secret

### Coverage Badge

Add to README:

```markdown
[![codecov](https://codecov.io/gh/username/repo/branch/main/graph/badge.svg)](https://codecov.io/gh/username/repo)
```

## Workflow Customization

### Adding Environment Variables

For new environment variables:

1. Add to GitHub Secrets
2. Reference in workflow:

```yaml
env:
  MY_VAR: ${{ secrets.MY_VAR }}
```

### Adding Jobs

Example: Add security scanning:

```yaml
security:
  name: Security Scan
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Run Trivy
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: '.'
```

### Conditional Jobs

Run E2E tests only on PRs to main:

```yaml
e2e-tests:
  if: github.event_name == 'pull_request' && github.base_ref == 'main'
```

### Matrix Builds

Test multiple Node versions:

```yaml
strategy:
  matrix:
    node: [18, 20, 22]
steps:
  - uses: actions/setup-node@v4
    with:
      node-version: ${{ matrix.node }}
```

## Troubleshooting

### CI Failing on Lint

```bash
# Fix locally
bun lint:fix
bun format
git add . && git commit --amend
git push -f
```

### E2E Tests Timeout

Increase timeout in workflow:

```yaml
- run: bun run test:e2e
  timeout-minutes: 30
```

### Vercel Deploy Fails

1. Check secrets are correct:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`

2. Verify project is linked:
   ```bash
   vercel link
   cat .vercel/project.json
   ```

### Database Connection Issues

1. Check `DATABASE_URL` secret is set
2. Verify Neon project allows connections from GitHub IPs
3. Ensure SSL mode is enabled (`?sslmode=require`)

### Cache Issues

Clear Turbo cache:

```yaml
- name: Clear cache
  run: rm -rf .turbo node_modules/.cache
```

## Best Practices

### 1. Keep Workflows Fast

- Use Turbo remote caching
- Run jobs in parallel
- Cache dependencies
- Cancel redundant runs

### 2. Fail Fast

Put fast checks first:

```yaml
jobs:
  lint:        # 30 seconds
  typecheck:   # 45 seconds
  unit-tests:  # 1 minute
  build:       # 2 minutes (depends on above)
  e2e-tests:   # 5 minutes (runs in parallel)
```

### 3. Secure Secrets

- Never log secrets
- Use environment protection for production
- Rotate tokens periodically
- Audit secret access

### 4. Monitor Costs

GitHub Actions free tier:
- 2,000 minutes/month (private repos)
- Unlimited (public repos)

Track usage in Settings → Billing.

## Complete Setup Verification

After setup, verify everything works:

1. **Create a test branch**:
   ```bash
   git checkout -b test/ci-setup
   echo "# Test" >> test.md
   git add . && git commit -m "test: verify CI"
   git push -u origin test/ci-setup
   ```

2. **Open a PR** to `main`

3. **Check workflow runs**:
   - Go to Actions tab
   - Verify all jobs pass
   - Check preview deployment URL in PR comment

4. **Merge PR** and verify production deployment

5. **Clean up**:
   ```bash
   git checkout main
   git pull
   git branch -d test/ci-setup
   ```
