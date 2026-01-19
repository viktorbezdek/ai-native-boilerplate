---
name: analytics-setup
description: Configure and implement product analytics with PostHog. Includes event tracking, feature flags, experiments, and session replay. Use when setting up analytics, creating tracking plans, or analyzing user behavior.
allowed-tools: Read, Write, Edit, Bash
---

# Analytics Setup Skill

## Purpose
Implement comprehensive product analytics to understand user behavior and make data-driven decisions.

## Platform
- **Analytics**: PostHog (self-hostable)
- **Features**: Events, Feature Flags, Experiments, Session Replay

## Initial Setup

### Installation
```bash
bun add posthog-js posthog-node
```

### Client Setup
```typescript
// src/lib/analytics/client.ts
import posthog from 'posthog-js';

export function initPostHog() {
  if (typeof window === 'undefined') return;
  if (process.env.NEXT_PUBLIC_ENV === 'development') return;
  
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    capture_pageview: false, // We handle this manually
    capture_pageleave: true,
    autocapture: true,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '.sensitive',
    },
  });
}

export { posthog };
```

### Server Setup
```typescript
// src/lib/analytics/server.ts
import { PostHog } from 'posthog-node';

const posthogServer = new PostHog(process.env.POSTHOG_API_KEY!, {
  host: process.env.POSTHOG_HOST || 'https://app.posthog.com',
});

export { posthogServer };
```

### Provider Component
```typescript
// src/components/providers/analytics.tsx
'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { posthog, initPostHog } from '@/lib/analytics/client';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    initPostHog();
  }, []);

  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname;
      if (searchParams?.toString()) {
        url += '?' + searchParams.toString();
      }
      posthog.capture('$pageview', { $current_url: url });
    }
  }, [pathname, searchParams]);

  return <>{children}</>;
}
```

## Event Tracking Plan

### Naming Convention
```
[object]_[action]
```
Examples:
- `user_signed_up`
- `subscription_created`
- `feature_used`

### Core Events

#### Authentication
| Event | Properties | Trigger |
|-------|------------|---------|
| `user_signed_up` | `method`, `source` | Registration complete |
| `user_logged_in` | `method` | Login success |
| `user_logged_out` | - | Logout |

#### Subscription
| Event | Properties | Trigger |
|-------|------------|---------|
| `subscription_created` | `plan`, `price`, `interval` | Checkout complete |
| `subscription_upgraded` | `from_plan`, `to_plan` | Upgrade complete |
| `subscription_cancelled` | `plan`, `reason` | Cancellation |

#### Feature Usage
| Event | Properties | Trigger |
|-------|------------|---------|
| `feature_used` | `feature_name`, `context` | Feature interaction |
| `export_created` | `format`, `item_count` | Export action |
| `search_performed` | `query`, `result_count` | Search submitted |

### Event Implementation
```typescript
// Track event
posthog.capture('feature_used', {
  feature_name: 'dark_mode',
  context: 'settings_page',
});

// Identify user
posthog.identify(user.id, {
  email: user.email,
  name: user.name,
  plan: user.subscription?.plan,
  created_at: user.createdAt,
});

// Group by organization
posthog.group('company', org.id, {
  name: org.name,
  plan: org.plan,
  employee_count: org.employeeCount,
});
```

## Feature Flags

### Setup
```typescript
// Check flag
const showNewFeature = posthog.isFeatureEnabled('new-feature');

// Get flag payload
const flagPayload = posthog.getFeatureFlagPayload('new-feature');

// React hook
import { useFeatureFlagEnabled } from 'posthog-js/react';

function Component() {
  const showFeature = useFeatureFlagEnabled('new-feature');
  if (!showFeature) return null;
  return <NewFeature />;
}
```

### Server-Side Flags
```typescript
// src/lib/analytics/flags.ts
import { posthogServer } from './server';

export async function getFeatureFlag(
  flagKey: string,
  distinctId: string,
  properties?: Record<string, any>
) {
  return posthogServer.getFeatureFlag(flagKey, distinctId, {
    personProperties: properties,
  });
}
```

## A/B Experiments

### Experiment Setup
```typescript
// Get experiment variant
const variant = posthog.getFeatureFlag('pricing-experiment');

// Track experiment exposure
posthog.capture('$experiment_started', {
  experiment: 'pricing-experiment',
  variant: variant,
});
```

### Analyzing Results
- Define success metric (conversion event)
- Set minimum sample size
- Run until statistical significance
- Document learnings

## Dashboard Configuration

### Key Dashboards
1. **Overview**: DAU, WAU, MAU, retention
2. **Acquisition**: Signup funnel, sources
3. **Engagement**: Feature usage, session depth
4. **Revenue**: MRR, churn, LTV

### Alerts
- DAU drops >20%
- Error rate >1%
- Conversion drops >10%

## Output Format
```markdown
## Analytics Implementation

### Events Added
| Event | Properties | Location |
|-------|------------|----------|

### Feature Flags
| Flag | Type | Description |
|------|------|-------------|

### Verification
- [ ] Events firing in PostHog
- [ ] User identification working
- [ ] Feature flags evaluating
- [ ] Session recording active
```
