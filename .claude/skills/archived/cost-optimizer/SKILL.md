---
name: cost-optimizer
description: Analyzes cloud spend, identifies waste, suggests right-sizing. Tracks cost per feature and alerts on budget anomalies.
allowed-tools:
  - Read
  - Grep
  - Glob
  - WebSearch
---

# Cost Optimizer

Analyzes infrastructure and operational costs, identifies optimization opportunities.

## When to Use

- Monthly cloud cost review
- Before scaling infrastructure
- When costs exceed budget
- Planning new feature cost impact
- Evaluating build vs buy decisions

## Analysis Areas

### Compute Optimization
- Instance right-sizing
- Reserved vs on-demand analysis
- Spot instance opportunities
- Auto-scaling configuration
- Idle resource detection

### Storage Optimization
- Unused volumes and snapshots
- Storage tier optimization
- Data lifecycle policies
- Backup retention review
- Object storage analysis

### Database Optimization
- Instance sizing
- Read replica necessity
- Connection pooling
- Query optimization impact
- Caching effectiveness

### Network Optimization
- Data transfer costs
- CDN utilization
- NAT gateway usage
- Cross-region traffic
- API call optimization

### Serverless Optimization
- Function memory sizing
- Cold start mitigation
- Concurrency limits
- Duration optimization
- Invocation patterns

## Cost Attribution

### Per-Feature Costing
```
Feature: User Authentication
├── API Gateway: $15/month
├── Lambda: $8/month
├── DynamoDB: $5/month
├── Cognito: $12/month
└── Total: $40/month
```

### Team/Project Attribution
- Tag-based cost allocation
- Cost center mapping
- Shared resource allocation
- Development vs production split

## Output Format

```markdown
## Cost Optimization Report

### Summary
- **Current Monthly Cost**: $X,XXX
- **Identified Savings**: $XXX (XX%)
- **Recommendation Priority**: High

### Cost Breakdown

| Service | Current | Optimized | Savings |
|---------|---------|-----------|---------|
| Compute | $500 | $350 | $150 |
| Storage | $200 | $150 | $50 |
| Database | $300 | $250 | $50 |
| **Total** | **$1,000** | **$750** | **$250** |

### Top Optimization Opportunities

#### 1. [Opportunity Name] - Save $XX/month
- **Current State**: [Description]
- **Recommended Action**: [Specific steps]
- **Risk Level**: [Low/Medium/High]
- **Implementation Effort**: [Hours/Days]

#### 2. [Opportunity Name] - Save $XX/month
...

### Anomalies Detected
- **[Date]**: Unusual spike in [service] (+$XX)
  - Likely cause: [Analysis]
  - Recommendation: [Action]

### Cost Forecast
| Month | Projected | Budget | Status |
|-------|-----------|--------|--------|
| Jan | $1,000 | $1,200 | ✓ Under |
| Feb | $1,100 | $1,200 | ⚠️ Close |
| Mar | $1,300 | $1,200 | ✗ Over |

### Action Items
| # | Action | Savings | Effort | Owner |
|---|--------|---------|--------|-------|
| 1 | [Action] | $XX | Low | [Team] |
```

## Common Optimizations

### Vercel (This Stack)
- Review function execution time
- Optimize edge function usage
- Analyze bandwidth consumption
- Review build minutes
- Consider caching strategies

### Database (Neon)
- Connection pooling configuration
- Query optimization
- Compute autoscaling settings
- Storage analysis
- Branching strategy review

### External Services
- Stripe: Review API call volume
- PostHog: Event volume optimization
- Sentry: Error volume analysis
- Resend: Email volume review

## Budget Alerts

### Threshold Configuration
```yaml
alerts:
  - threshold: 80%
    action: notify
    message: "Approaching budget limit"

  - threshold: 100%
    action: notify + review
    message: "Budget exceeded - review required"

  - threshold: 120%
    action: pause + escalate
    message: "Critical overspend - immediate action"
```

### Anomaly Detection
- Daily cost variance > 20%
- Unexpected new service charges
- Unusual traffic patterns
- After-hours usage spikes

## Best Practices

1. **Tag Everything** - Enable cost attribution from day one
2. **Right-Size First** - Optimize before scaling
3. **Use Reserved Capacity** - For predictable workloads
4. **Monitor Continuously** - Set up alerts early
5. **Review Regularly** - Monthly cost review cadence
6. **Cost-Aware Development** - Consider costs in design decisions
