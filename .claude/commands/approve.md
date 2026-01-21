# /approve - Set Auto-Approval Level

Set the auto-approval level for workflow execution.

## Usage
```
/approve <level>
```

## Arguments
- `level` (required): Approval level to set

## Approval Levels

| Level | Description |
|-------|-------------|
| `none` | Require approval for all operations (supervised mode) |
| `low` | Auto-approve: planning, testing, reads |
| `medium` | Auto-approve: all development tasks, non-prod deploys |
| `high` | Auto-approve: everything except prod deploys and infra |

## Level Details

### none (Most Restrictive)
```
Auto-approved: Nothing
Requires approval: Everything
```

### low
```
Auto-approved:
  ✓ Planning and analysis
  ✓ Running tests
  ✓ Read operations
  ✓ Non-destructive queries

Requires approval:
  ✗ Code changes
  ✗ Deployments
  ✗ Destructive operations
```

### medium
```
Auto-approved:
  ✓ All low-level operations
  ✓ Code creation and modification
  ✓ Preview/staging deployments
  ✓ Database migrations (non-prod)

Requires approval:
  ✗ Production deployments
  ✗ Infrastructure changes
  ✗ Cost > $50
```

### high
```
Auto-approved:
  ✓ All medium-level operations
  ✓ Incident response runbooks
  ✓ Auto-scaling operations

Requires approval:
  ✗ Production deployments
  ✗ Infrastructure changes
  ✗ Cost > $100
```

## Example

```bash
# Set to low approval
/approve low

# Set to medium
/approve medium

# Back to fully supervised
/approve none
```

## Output

```
Approval level set: medium

Auto-approved operations:
  ✓ Planning and analysis
  ✓ Test execution
  ✓ Code changes
  ✓ Preview deployments

Operations requiring approval:
  ✗ Production deployments
  ✗ Infrastructure changes
  ✗ Operations > $50
```

## Related Commands
- `/config` - All configuration
- `/budget` - Set cost limits
- `/execute` - Run with approval settings
