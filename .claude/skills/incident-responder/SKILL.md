---
name: incident-responder
description: Handle production incidents with structured runbooks, escalation procedures, postmortem templates, and auto-remediation capabilities. Use when responding to outages, investigating errors, or writing postmortems.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
  - mcp__sentry__*
  - mcp__vercel__*
  - mcp__github__*
---

# Incident Responder

## Purpose
Provide structured incident response procedures to minimize downtime and learn from failures.

## Severity Levels

| Level | Definition | Response Time | Examples |
|-------|------------|---------------|----------|
| **SEV1** | Complete outage | Immediate | Site down, data loss |
| **SEV2** | Major degradation | < 15 min | Auth broken, payments failing |
| **SEV3** | Minor degradation | < 1 hour | Slow performance, non-critical bug |
| **SEV4** | Low impact | < 4 hours | Cosmetic issues, minor UX bugs |

## Incident Response Process

### 1. Detection
- Automated alerts (Sentry, BetterStack)
- User reports
- Monitoring dashboards

### 2. Triage (< 5 minutes)
```markdown
## Incident Triage

**Time Detected**: [timestamp]
**Severity**: SEV1 | SEV2 | SEV3 | SEV4
**Summary**: [one sentence]

### Impact Assessment
- [ ] Who is affected?
- [ ] What functionality is broken?
- [ ] What's the blast radius?

### Initial Hypothesis
[What might be causing this]
```

### 3. Mitigation
Priority: Restore service first, investigate later.

**Common Mitigations:**
- Rollback deployment
- Scale up resources
- Enable feature flag bypass
- Redirect traffic
- Clear cache

### 4. Resolution
- Identify root cause
- Implement fix
- Verify fix in production
- Close incident

### 5. Postmortem
Required for all SEV1 and SEV2 incidents.

## Runbooks

### Site Down
```markdown
## Runbook: Site Completely Down

### Quick Checks (< 2 min)
1. Vercel status: https://www.vercel-status.com/
2. Neon status: https://neonstatus.com/
3. Check recent deployments: `bunx vercel ls`

### If Recent Deploy
1. Identify last known good deployment
2. Rollback: `bunx vercel promote [deployment-url]`
3. Verify site is up
4. Investigate failed deployment

### If No Recent Deploy
1. Check Sentry for new errors
2. Check database connectivity
3. Check API health: `curl https://domain.com/api/health`
4. Review Vercel function logs

### Escalation
If not resolved in 15 minutes:
- Page on-call engineer
- Update status page
```

### Database Connection Failures
```markdown
## Runbook: Database Connection Failures

### Symptoms
- 500 errors on API endpoints
- "Connection refused" in logs
- Timeouts on queries

### Quick Checks
1. Neon console: Check database status
2. Connection pool: Check for exhaustion
3. Recent migrations: Any schema changes?

### Mitigations
1. Restart Vercel functions (redeploy)
2. Increase connection pool size
3. Check for long-running queries
4. Verify connection string is correct
```

### High Error Rate
```markdown
## Runbook: High Error Rate

### Symptoms
- Sentry alert for error spike
- Error rate > 1%

### Investigation
1. Open Sentry, group by error type
2. Identify common patterns:
   - Same endpoint?
   - Same user segment?
   - Same region?
3. Check for correlation with:
   - Recent deployment
   - Traffic spike
   - External service issues

### Mitigations
1. If deployment-related: Rollback
2. If rate-limit: Enable rate limiting
3. If specific endpoint: Feature flag disable
```

## Postmortem Template

```markdown
# Postmortem: [Incident Title]

**Date**: [YYYY-MM-DD]
**Duration**: [X hours Y minutes]
**Severity**: SEV[N]
**Author**: [Name]

## Summary
[2-3 sentence summary of what happened]

## Timeline (all times UTC)
| Time | Event |
|------|-------|
| HH:MM | [Event description] |

## Root Cause
[Detailed explanation of what caused the incident]

## Impact
- **Users Affected**: [number/percentage]
- **Revenue Impact**: [if applicable]
- **Data Impact**: [any data loss or corruption]

## Detection
How was the incident detected?
- [ ] Automated alert
- [ ] User report
- [ ] Internal discovery

**Detection Time**: [time from occurrence to detection]

## Response
What was done to mitigate and resolve?

### What Went Well
- [Positive aspect]

### What Could Be Improved
- [Area for improvement]

## Action Items
| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| [Action] | [Name] | [Date] | Open |

## Lessons Learned
[Key takeaways from this incident]

## Prevention
How will we prevent this from happening again?
```

## Communication Templates

### Internal Update
```
🚨 Incident Update [SEV-N]

Status: Investigating | Identified | Monitoring | Resolved
Summary: [Brief description]
Impact: [Who/what is affected]
ETA: [If known]

Next update in [X] minutes.
```

### Status Page Update
```
[Title]

We are investigating reports of [issue description].

Affected services:
- [Service 1]
- [Service 2]

We will provide updates as we learn more.
```

## Output Format
```markdown
## Incident Response

### Status
- **Severity**: SEV[N]
- **Status**: Active | Mitigated | Resolved
- **Duration**: [time]

### Actions Taken
1. [Action and result]

### Current State
[What's the current situation]

### Next Steps
- [ ] [Next action]

### Follow-up Required
- [ ] Postmortem
- [ ] Action items
```
