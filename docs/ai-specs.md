# Writing Specs for AI

This guide covers how to write specifications that Claude Code can understand and implement effectively. Good specs lead to better code, fewer iterations, and more autonomous development.

## Why Specs Matter for AI

Claude Code works best when it understands:
1. **What** you want to build (requirements)
2. **Why** it matters (context)
3. **How** it should work (behavior)
4. **Where** it fits (architecture)

Vague specs lead to clarifying questions. Precise specs lead to implementation.

## Spec Structure

### Minimal Spec

For simple features:

```markdown
## Add "Last Login" Display

Show the user's last login time on the dashboard.

- Display format: "Last login: January 15, 2024 at 3:30 PM"
- Show "Never" if no previous login
- Update on each successful sign-in
```

### Standard Spec

For moderate features:

```markdown
## User Notification Preferences

### Overview
Allow users to control which notifications they receive via email and in-app.

### Requirements
- Users can toggle email notifications on/off
- Users can toggle in-app notifications on/off
- Each notification type can be individually controlled:
  - Account updates
  - Security alerts
  - Marketing emails
  - Product updates

### User Stories
1. As a user, I want to disable marketing emails while keeping security alerts
2. As a user, I want to turn off all notifications with one click

### Technical Notes
- Store preferences in `user_preferences` table
- Default: all notifications on for new users
- Respect preferences in email service calls
```

### Detailed Spec

For complex features:

```markdown
## Subscription Upgrade Flow

### Overview
Allow Pro users to upgrade to Business plan mid-billing cycle with prorated pricing.

### Problem
Users on Pro ($19/month) want to upgrade to Business ($49/month) without waiting for their next billing cycle.

### Solution
Implement mid-cycle upgrade with Stripe proration.

### Requirements

#### Functional
- [ ] Show upgrade option on billing page
- [ ] Display prorated amount before confirmation
- [ ] Process upgrade immediately on confirmation
- [ ] Send confirmation email
- [ ] Update user's plan in database
- [ ] Track upgrade event in PostHog

#### Non-Functional
- Upgrade must complete in < 5 seconds
- Graceful handling of Stripe API failures
- Idempotent (safe to retry)

### User Flow
1. User clicks "Upgrade to Business" on /settings/billing
2. Modal shows:
   - Current plan details
   - New plan details
   - Prorated charge amount
   - "You'll be charged $X today"
3. User confirms
4. System processes upgrade
5. Success message shown
6. Email confirmation sent

### API Design

POST /api/v1/billing/upgrade
Request:
{
  "newPlanId": "business"
}

Response (success):
{
  "success": true,
  "subscription": {
    "plan": "business",
    "currentPeriodEnd": "2024-02-15T00:00:00Z"
  },
  "chargedAmount": 2500
}

Response (error):
{
  "error": "Payment failed",
  "code": "card_declined"
}

### Database Changes
None required - uses existing subscriptions table.

### Edge Cases
- User's card is declined → Show error, don't change plan
- User upgrades then immediately cancels → Standard cancellation flow
- User already on Business → Show "already on this plan"
- Webhook arrives before API response → Idempotent handling

### Testing
- Unit: Proration calculation
- Integration: Stripe API mocking
- E2E: Full upgrade flow with test cards

### Rollout
1. Deploy behind feature flag
2. Enable for internal team
3. Enable for 10% of users
4. Full rollout
```

## Writing Effective Requirements

### Be Specific

**Bad:**
```
Add user profiles
```

**Good:**
```
Add user profile page at /profile with:
- Display name (editable, 1-50 chars)
- Avatar (upload, max 2MB, jpeg/png)
- Bio (editable, max 500 chars)
- Account created date (read-only)
```

### Include Constraints

**Bad:**
```
Users can upload files
```

**Good:**
```
Users can upload files:
- Max size: 10MB
- Allowed types: pdf, docx, xlsx
- Max 5 files per upload
- Storage: Cloudflare R2
- Naming: {userId}/{uuid}.{ext}
```

### Define Behavior

**Bad:**
```
Handle errors appropriately
```

**Good:**
```
Error handling:
- Network error → Retry 3x with exponential backoff, then show "Connection failed"
- Validation error → Show field-level errors inline
- Server error → Show generic message, log to Sentry
- Rate limit → Show "Too many requests, try again in X seconds"
```

### Specify Data Shapes

**Bad:**
```
Return the user's projects
```

**Good:**
```
GET /api/v1/projects

Response:
{
  "data": [
    {
      "id": "proj_xxx",
      "name": "My Project",
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-16T14:30:00Z",
      "status": "active" | "archived"
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 20
  }
}
```

## Context That Helps

### Existing Patterns

Reference existing code:

```markdown
## Add Team Invitations

Follow the same pattern as user authentication:
- Use Better Auth's email verification flow
- Store pending invites similar to sessions table
- Email template like welcome.tsx
```

### Architecture Decisions

Explain why:

```markdown
## WebSocket Notifications

Using Pusher instead of native WebSockets because:
- No server state to manage
- Works with serverless (Vercel)
- Built-in presence channels

Already have @pusher/pusher-js in dependencies.
```

### Related Files

Point to relevant code:

```markdown
## Add Audit Logging

Reference files:
- packages/database/src/schema.ts (add audit_logs table)
- apps/web/src/lib/db.ts (database connection)
- apps/web/src/server/actions/users.ts (example server action)
```

## Using Slash Commands

### `/plan` for Decomposition

Start with a spec, let Claude break it down:

```
/plan

Implement subscription upgrade flow:
- Show upgrade option on billing page
- Calculate prorated amount
- Process through Stripe
- Update database
- Send confirmation email
```

Claude returns a task breakdown you can review and adjust.

### `/implement` with Spec

Provide spec directly:

```
/implement

Create POST /api/v1/billing/upgrade endpoint:
- Verify user is authenticated
- Verify user has active Pro subscription
- Calculate proration via Stripe API
- Create subscription update
- Return new subscription details

Follow API patterns in apps/web/src/app/api/v1/
```

### `/test` with Acceptance Criteria

```
/test

Test subscription upgrade:
1. User with Pro plan can upgrade to Business
2. Prorated amount is calculated correctly
3. Card decline shows appropriate error
4. Success triggers confirmation email
```

## Anti-Patterns to Avoid

### Too Vague

```
Make the app faster
```

**Better:**
```
Improve dashboard load time:
- Add database index on projects.userId
- Cache user subscription status (5 min TTL)
- Lazy load project list below fold
```

### Too Prescriptive

```
Create file src/utils/helper.ts with function
calculateTax(amount: number) that multiplies
by 0.08 and rounds to 2 decimal places
```

**Better:**
```
Add sales tax calculation:
- 8% rate for all orders
- Round to nearest cent
- Apply after discounts
```

Let Claude choose appropriate file location and implementation.

### Missing Context

```
Fix the bug
```

**Better:**
```
Fix: Users see stale subscription status after upgrade

Repro:
1. User upgrades from Pro to Business
2. Refresh dashboard
3. Still shows "Pro"

Expected: Should show "Business" immediately

Root cause: Subscription is cached in React Query
```

### No Success Criteria

```
Improve the onboarding flow
```

**Better:**
```
Improve onboarding flow:

Success criteria:
- Reduce time-to-first-action from 5min to 2min
- Reduce drop-off at step 2 from 40% to 20%

Changes:
- Combine steps 1 and 2
- Add skip option for optional fields
- Show progress indicator
```

## Spec Templates

### Bug Fix

```markdown
## Bug: [Short Description]

### Current Behavior
What happens now.

### Expected Behavior
What should happen.

### Reproduction Steps
1. Step one
2. Step two
3. Observe bug

### Environment
- Browser: Chrome 120
- OS: macOS 14
- User type: Pro subscriber

### Possible Cause
Initial hypothesis if known.

### Acceptance Criteria
- [ ] Bug no longer reproducible
- [ ] Regression test added
- [ ] No new errors in Sentry
```

### New Feature

```markdown
## Feature: [Name]

### Overview
One paragraph description.

### Problem
What problem this solves.

### Solution
High-level approach.

### Requirements
- [ ] Requirement 1
- [ ] Requirement 2

### User Stories
- As a [user type], I want to [action] so that [benefit]

### Technical Notes
Any implementation guidance.

### Out of Scope
What this doesn't include.

### Success Metrics
How we'll measure success.
```

### API Endpoint

```markdown
## API: [METHOD] [path]

### Purpose
What this endpoint does.

### Authentication
- Required: Yes/No
- Roles: admin, user, etc.

### Request
```json
{
  "field": "type and description"
}
```

### Response (200)
```json
{
  "data": {}
}
```

### Errors
| Code | Condition |
|------|-----------|
| 400 | Invalid input |
| 401 | Not authenticated |
| 404 | Resource not found |

### Rate Limit
X requests per Y period.
```

## Best Practices

### 1. Write for Implementation

Think about what Claude needs to know to write code:
- Input/output shapes
- Edge cases
- Error conditions
- Where code should go

### 2. Reference Existing Patterns

```
Follow the pattern in src/app/api/v1/projects/route.ts
```

This gives Claude concrete examples to match.

### 3. Include Test Cases

```
Test cases:
- Empty input → validation error
- Valid input → success response
- Duplicate entry → conflict error
```

### 4. Specify Non-Obvious Behavior

```
Edge cases:
- If user deletes account during trial, don't charge
- If webhook arrives before API response, handle idempotently
```

### 5. Iterate on Specs

After Claude's first pass:
```
Refine: Add loading state while subscription updates
Refine: Handle case where Stripe is temporarily unavailable
```

## Working with Claude Code's Memory

Past specs inform future work. Structure specs consistently so patterns emerge:

```markdown
## Feature: X

### What
...

### Why
...

### How
...

### Tests
...
```

Claude Code learns your conventions over time through the memory system.
