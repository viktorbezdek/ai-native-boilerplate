# Feature Plan: AI Asset Marketplace (Subscription-Based)

## Overview

A subscription-based library where users access a complete catalog of AI prompts, chains, skills, and agents. Features a free tier for lead generation and a paid subscriber tier with full catalog access. Single owner manages the catalog; no multi-vendor marketplace complexity.

**Key Simplifications vs Traditional Marketplace:**
- Single owner/creator (you) - no seller onboarding or payouts
- Subscription-based access - no per-item transactions
- Two tiers: Free (limited assets) and Subscriber (full access)
- No shopping cart needed - direct subscription upgrade flow

---

## Architecture Decisions

### Data Model
- **Assets** stored in database with content in JSONB (prompts are small, < 500KB)
- **Access control** via `is_free` boolean flag per asset
- **Subscription status** from existing `subscriptions` table determines access
- **Categories** as enum type (simpler than separate table for v1)

### Access Pattern
```
Visitor      → Browse only (no content access)
Free User    → Free assets only
Subscriber   → All assets
Owner/Admin  → Full admin access
```

### Reusable Components
- Existing Stripe subscription flow (checkout, billing portal, webhooks)
- Better Auth sessions and user management
- API middleware (rate limiting, CSRF)
- shadcn/ui components and Tailwind patterns

---

## Tasks

### Phase 1: Database Schema & Core Infrastructure

- [ ] **1.1 Create assets table schema** (M)
  - Description: Add assets table with all required fields for AI prompts/agents storage
  - Files: `packages/database/src/schema.ts`
  - Dependencies: None
  - Acceptance:
    - Table includes: id, title, slug, description, content (JSONB), category, type, model_compatibility, sample_input, sample_output, is_free, is_published, view_count, download_count, created_at, updated_at
    - Proper indexes on slug, category, is_free, is_published
    - Category enum: prompt, chain, skill, agent
    - Type enum for sub-categories

- [ ] **1.2 Create asset categories enum** (S)
  - Description: Define asset type and category enums
  - Files: `packages/database/src/schema.ts`
  - Dependencies: 1.1
  - Acceptance:
    - Asset types: prompt, chain, skill, agent
    - Model compatibility: openai, anthropic, google, open-source, universal

- [ ] **1.3 Create user asset access tracking** (S)
  - Description: Add table to track user downloads/views for analytics
  - Files: `packages/database/src/schema.ts`
  - Dependencies: 1.1
  - Acceptance:
    - Tracks user_id, asset_id, access_type (view/download), format, timestamp
    - Index on user_id, asset_id for quick lookups

- [ ] **1.4 Generate and run migrations** (S)
  - Description: Create Drizzle migration for new tables
  - Files: `drizzle/migrations/`
  - Dependencies: 1.1, 1.2, 1.3
  - Acceptance:
    - Migration generated successfully
    - Migration runs without errors on dev database

- [ ] **1.5 Create asset query functions** (M)
  - Description: Implement database queries for assets CRUD and search
  - Files: `packages/database/src/queries/assets.ts`
  - Dependencies: 1.4
  - Acceptance:
    - `getAssets(filters, pagination)` - list with filtering
    - `getAssetBySlug(slug)` - single asset lookup
    - `getAssetById(id)` - for admin
    - `createAsset(data)` - owner only
    - `updateAsset(id, data)` - owner only
    - `deleteAsset(id)` - owner only
    - `incrementViewCount(id)` / `incrementDownloadCount(id)`
    - Full-text search on title + description

---

### Phase 2: Asset Management (Owner Admin)

- [ ] **2.1 Create asset validation schemas** (S)
  - Description: Zod schemas for asset creation and updates
  - Files: `packages/validations/src/assets.ts`
  - Dependencies: 1.1
  - Acceptance:
    - `createAssetSchema` - all required fields validated
    - `updateAssetSchema` - partial updates
    - `assetFilterSchema` - query param validation
    - Content size limits enforced (500KB prompts, 5MB agents)

- [ ] **2.2 Create asset server actions** (M)
  - Description: Server actions for asset CRUD operations
  - Files: `apps/web/src/lib/actions/assets.ts`
  - Dependencies: 1.5, 2.1
  - Acceptance:
    - `createAssetAction` - admin only, validates input, creates asset
    - `updateAssetAction` - admin only, partial updates
    - `deleteAssetAction` - admin only, soft delete or hard delete
    - `toggleAssetAccessAction` - flip is_free flag
    - `togglePublishAction` - flip is_published flag
    - Proper error handling and analytics tracking

- [ ] **2.3 Create admin asset list page** (M)
  - Description: Page to list/manage all assets for owner
  - Files: `apps/web/src/app/(dashboard)/admin/assets/page.tsx`, `_components/`
  - Dependencies: 2.2
  - Acceptance:
    - Table view with: title, category, type, access level, status, views, downloads
    - Filters for category, type, access level, status
    - Actions: edit, delete, toggle publish, toggle access
    - Pagination

- [ ] **2.4 Create asset editor page** (L)
  - Description: Form to create/edit assets with preview
  - Files: `apps/web/src/app/(dashboard)/admin/assets/[id]/page.tsx`, `apps/web/src/app/(dashboard)/admin/assets/new/page.tsx`
  - Dependencies: 2.2, 2.3
  - Acceptance:
    - Rich form with all asset fields
    - JSONB content editor (code editor component)
    - Model compatibility multi-select
    - Sample input/output fields
    - Preview mode to see how asset will appear
    - Save draft / Publish workflow

- [ ] **2.5 Create owner dashboard metrics** (M)
  - Description: Dashboard showing MRR, subscribers, popular assets
  - Files: `apps/web/src/app/(dashboard)/admin/page.tsx`
  - Dependencies: 1.5
  - Acceptance:
    - MRR calculation from Stripe subscriptions
    - Active subscriber count
    - Total assets / free vs subscriber
    - Top 10 most viewed/downloaded assets
    - New signups this month
    - Charts for trends (optional v1)

---

### Phase 3: Public Catalog & Browse

- [ ] **3.1 Create public catalog API** (M)
  - Description: API endpoint for browsing/searching assets
  - Files: `apps/web/src/app/api/v1/assets/route.ts`
  - Dependencies: 1.5, 2.1
  - Acceptance:
    - GET with filters: category, type, model, is_free, search query
    - Pagination with cursor or offset
    - Returns public fields only (no content for non-authenticated)
    - p95 < 500ms response time
    - Rate limiting applied

- [ ] **3.2 Create catalog browse page** (M)
  - Description: Public page to browse all assets
  - Files: `apps/web/src/app/(marketing)/catalog/page.tsx`, `_components/`
  - Dependencies: 3.1
  - Acceptance:
    - Grid/list view of assets
    - Clear FREE / SUBSCRIBER badges
    - Filter sidebar: category, type, model, access level
    - Search bar with debounced input
    - Responsive design (mobile-friendly)

- [ ] **3.3 Create asset card component** (S)
  - Description: Reusable card for displaying asset in grid
  - Files: `apps/web/src/components/features/asset-card.tsx`
  - Dependencies: None
  - Acceptance:
    - Shows: title, description preview, category icon, type badge, access badge
    - Hover state with subtle animation
    - Click navigates to detail page
    - Responsive sizing

- [ ] **3.4 Create asset detail page** (M)
  - Description: Public page showing asset details with access control
  - Files: `apps/web/src/app/(marketing)/catalog/[slug]/page.tsx`
  - Dependencies: 3.1
  - Acceptance:
    - Full description, model compatibility, sample I/O displayed
    - If visitor: "Sign up free to access" CTA
    - If free user + free asset: show content + download options
    - If free user + subscriber asset: "Upgrade to access" CTA
    - If subscriber: show content + download options
    - Download formats: JSON, YAML, plain text, copy-to-clipboard
    - View count incremented on page load

- [ ] **3.5 Create asset search component** (S)
  - Description: Search bar with autocomplete suggestions
  - Files: `apps/web/src/components/features/asset-search.tsx`
  - Dependencies: 3.1
  - Acceptance:
    - Debounced input (300ms)
    - Shows top 5 suggestions as user types
    - Keyboard navigation (up/down/enter)
    - Search icon and clear button

---

### Phase 4: Access Control & Download

- [ ] **4.1 Create access control middleware** (M)
  - Description: Utility to check if user can access specific asset
  - Files: `apps/web/src/lib/access-control.ts`
  - Dependencies: 1.5
  - Acceptance:
    - `canAccessAsset(user, asset)` returns boolean
    - Checks: is_free flag, user subscription status, admin role
    - Caches subscription status for request duration

- [ ] **4.2 Create download API endpoint** (M)
  - Description: API to download asset in specified format
  - Files: `apps/web/src/app/api/v1/assets/[id]/download/route.ts`
  - Dependencies: 4.1
  - Acceptance:
    - GET with format query param (json, yaml, txt)
    - Returns 401 if not authenticated
    - Returns 403 if no access (with upgrade prompt)
    - Returns asset content in requested format
    - Logs download for analytics
    - Rate limited to prevent abuse

- [ ] **4.3 Create download button component** (S)
  - Description: Button with format dropdown for downloading
  - Files: `apps/web/src/components/features/asset-download.tsx`
  - Dependencies: 4.2
  - Acceptance:
    - Dropdown with format options
    - Copy-to-clipboard option
    - Shows loading state during download
    - Success toast on copy/download

- [ ] **4.4 Create upgrade prompt component** (S)
  - Description: CTA shown when free user tries to access subscriber content
  - Files: `apps/web/src/components/features/upgrade-prompt.tsx`
  - Dependencies: None
  - Acceptance:
    - Clear value proposition
    - Monthly/annual pricing display
    - "Upgrade Now" button links to checkout
    - Dismissible but persistent indicator

---

### Phase 5: Subscription Integration

- [ ] **5.1 Add marketplace subscription products** (S)
  - Description: Configure Stripe products for marketplace access
  - Files: `apps/web/src/lib/stripe/index.ts`, environment config
  - Dependencies: None
  - Acceptance:
    - Monthly subscription price ID configured
    - Annual subscription price ID configured (17% discount)
    - Products created in Stripe dashboard

- [ ] **5.2 Update checkout flow for marketplace** (M)
  - Description: Modify checkout to handle marketplace subscriptions
  - Files: `apps/web/src/app/api/v1/checkout/route.ts`, `packages/payments/src/checkout.ts`
  - Dependencies: 5.1
  - Acceptance:
    - Supports new marketplace price IDs
    - Success URL redirects to catalog
    - Metadata includes subscription_type: 'marketplace'

- [ ] **5.3 Create pricing page** (M)
  - Description: Public pricing page with subscription options
  - Files: `apps/web/src/app/(marketing)/pricing/page.tsx`
  - Dependencies: 5.1
  - Acceptance:
    - Free tier features listed
    - Subscriber tier features listed
    - Monthly/annual toggle
    - Annual savings highlighted
    - CTAs: "Start Free" / "Subscribe"

- [ ] **5.4 Update billing portal integration** (S)
  - Description: Ensure billing portal works for marketplace subscriptions
  - Files: `apps/web/src/app/(dashboard)/settings/billing/page.tsx`
  - Dependencies: 5.2
  - Acceptance:
    - Shows current subscription status
    - "Manage Subscription" opens Stripe portal
    - Cancel flow works correctly

---

### Phase 6: User Dashboard

- [ ] **6.1 Create user library page** (M)
  - Description: Dashboard page showing user's accessible assets
  - Files: `apps/web/src/app/(dashboard)/library/page.tsx`
  - Dependencies: 4.1
  - Acceptance:
    - If subscriber: shows all assets
    - If free: shows free assets + teaser of subscriber content
    - Recently viewed section
    - Recently added section (last 14 days, "New" badge)
    - Quick filters by category

- [ ] **6.2 Create recently viewed tracking** (S)
  - Description: Track and display user's recent asset views
  - Files: `packages/database/src/queries/user-activity.ts`
  - Dependencies: 1.3
  - Acceptance:
    - `trackAssetView(userId, assetId)` - upsert view record
    - `getRecentlyViewed(userId, limit)` - returns recent assets
    - Limited to last 20 views per user

- [ ] **6.3 Update dashboard navigation** (S)
  - Description: Add library link to dashboard nav
  - Files: `apps/web/src/components/features/dashboard-nav.tsx`
  - Dependencies: 6.1
  - Acceptance:
    - "Library" link in sidebar
    - Active state when on library page
    - Icon consistent with other nav items

---

### Phase 7: Email Notifications

- [ ] **7.1 Create new asset notification email** (S)
  - Description: Email template for notifying subscribers of new assets
  - Files: `packages/email/src/templates/new-asset.tsx`
  - Dependencies: None
  - Acceptance:
    - Shows asset title, description, category
    - CTA to view asset
    - Unsubscribe link
    - Mobile-responsive design

- [ ] **7.2 Create notification preferences** (S)
  - Description: Add email preference to user settings
  - Files: `packages/database/src/schema.ts`, `apps/web/src/app/(dashboard)/settings/notifications/page.tsx`
  - Dependencies: 7.1
  - Acceptance:
    - `notify_new_assets` boolean field on users table
    - Settings page to toggle preference
    - Default: true for subscribers

- [ ] **7.3 Create notification sending job** (M)
  - Description: Function to send notifications when asset published
  - Files: `apps/web/src/lib/notifications/new-asset.ts`
  - Dependencies: 7.1, 7.2
  - Acceptance:
    - Triggered when asset is published
    - Only sends to subscribers with preference enabled
    - Batched sending to avoid rate limits
    - Tracks sent notifications

---

### Phase 8: Testing

- [ ] **8.1 Unit tests for asset queries** (M)
  - Description: Test database query functions
  - Files: `packages/database/src/queries/__tests__/assets.test.ts`
  - Dependencies: 1.5
  - Acceptance:
    - Tests for all CRUD operations
    - Tests for filtering and search
    - Tests for pagination
    - Mocked database

- [ ] **8.2 Integration tests for asset APIs** (M)
  - Description: Test API endpoints
  - Files: `apps/web/tests/integration/api/assets.test.ts`
  - Dependencies: 3.1, 4.2
  - Acceptance:
    - Tests for all endpoints
    - Tests access control (visitor, free, subscriber, admin)
    - Tests error cases
    - Mocked auth and database

- [ ] **8.3 E2E tests for catalog flow** (M)
  - Description: End-to-end tests for browse and access flows
  - Files: `apps/web/tests/e2e/catalog.spec.ts`
  - Dependencies: All previous tasks
  - Acceptance:
    - Browse catalog as visitor
    - Register and access free asset
    - Upgrade prompt shown for subscriber content
    - Subscribe and access all content
    - Download in different formats

---

## Task Dependencies Graph

```
Phase 1: Schema
  1.1 ─┬─ 1.2
      ├─ 1.3
      └─ 1.4 ─── 1.5

Phase 2: Admin (requires 1.5)
  2.1 ─┬─ 2.2 ─── 2.3 ─── 2.4
      │
      └─ 2.5

Phase 3: Browse (requires 1.5, 2.1)
  3.1 ─┬─ 3.2
      ├─ 3.4
      └─ 3.5
  3.3 (parallel)

Phase 4: Access (requires 1.5)
  4.1 ─── 4.2 ─── 4.3
  4.4 (parallel)

Phase 5: Subscription (parallel to 2-4)
  5.1 ─── 5.2 ─── 5.3
         └─ 5.4

Phase 6: Dashboard (requires 4.1)
  6.1 ─── 6.2
  6.3 (parallel)

Phase 7: Notifications (parallel)
  7.1 ─── 7.2 ─── 7.3

Phase 8: Testing (requires all)
  8.1, 8.2, 8.3
```

---

## Parallelizable Work

These task groups can be worked on simultaneously:

**Group A** (Core): 1.1 → 1.5 → 2.2
**Group B** (UI): 3.3, 4.3, 4.4 (components with no deps)
**Group C** (Stripe): 5.1 → 5.2 → 5.3, 5.4
**Group D** (Notifications): 7.1 → 7.2 → 7.3

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Full-text search performance | Use PostgreSQL GIN index; add caching layer if needed |
| Large asset content | Enforce size limits; consider S3 for files > 1MB |
| Subscription sync issues | Rely on Stripe webhooks; add reconciliation job |
| Email deliverability | Use Resend with proper SPF/DKIM; monitor bounce rates |

---

## Success Criteria

Before marking feature complete:
- [ ] All acceptance criteria in AC-1.x through AC-5.x pass
- [ ] Test coverage > 80% for new code
- [ ] p95 search latency < 500ms
- [ ] LCP < 2.5s on catalog pages
- [ ] Subscription upgrade flow < 5s
- [ ] Mobile responsive on all pages
- [ ] No critical security vulnerabilities

---

## Assumptions Confirmed

1. ✅ Single subscription tier (Monthly + Annual)
2. ✅ Annual billing at ~17% discount
3. ✅ Free assets = owner-designated subset
4. ✅ No usage caps for subscribers
5. ✅ Stripe for all billing

---

**Plan Status:** Ready for approval

**Estimated Tasks:** 31 total
- Small (S): 13 tasks
- Medium (M): 15 tasks
- Large (L): 3 tasks
