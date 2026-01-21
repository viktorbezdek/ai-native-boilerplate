# /budget - Set Cost Ceiling

Set the maximum cost allowed for workflow execution.

## Usage
```
/budget <amount> [currency]
```

## Arguments
- `amount` (required): Maximum cost amount
- `currency` (optional): Currency code (default: USD)

## Process

1. **Set Limit**
   - Store budget configuration
   - Apply to current and future tasks

2. **Monitor Usage**
   - Track cost as tasks execute
   - Warn at 80% threshold
   - Pause at 100% threshold

3. **Enforcement**
   - Tasks exceeding budget require approval
   - Workflow pauses if budget exceeded

## Behavior at Thresholds

| Threshold | Action |
|-----------|--------|
| 50% | Log milestone |
| 80% | Warning notification |
| 95% | High-cost tasks require approval |
| 100% | Pause workflow, request budget increase |

## Example

```bash
# Set $50 budget
/budget 50

# Set budget with currency
/budget 100 EUR

# Unlimited budget (use with caution)
/budget unlimited
```

## Output

```
Budget set: $50.00 USD

Current usage: $12.50 (25%)

Thresholds:
  ⚪ 50% ($25.00) - Milestone log
  ⚪ 80% ($40.00) - Warning
  ⚪ 95% ($47.50) - Approval required
  ⚪ 100% ($50.00) - Pause workflow

Remaining: $37.50
```

## Warnings

```
⚠️ Budget Warning (80% used)

Budget: $50.00 USD
Used: $40.00 (80%)
Remaining: $10.00

High-cost operations will require approval.
To increase: /budget 100
```

## Related Commands
- `/config` - All configuration
- `/approve` - Set approval levels
- `/status` - Check current usage
