# /simulate - Simulate Execution

Test execution plan without side effects.

## Usage
```
/simulate <plan_id> [--dry-run]
```

## Arguments
- `plan_id` (required): Workflow or plan ID to simulate
- `--dry-run`: Full dry run without any changes

## Process

1. **Load Plan**
   - Retrieve execution plan
   - Validate structure

2. **Simulate Execution**
   - Walk through task graph
   - Estimate resource usage
   - Identify potential issues

3. **Generate Report**
   - Execution path
   - Estimated cost/time
   - Risk assessment

## Simulation Modes

### Dry Run (--dry-run)
- No file changes
- No external calls
- No state modifications
- Full validation only

### Standard Simulation
- Validates plan structure
- Checks dependencies
- Estimates resources
- Identifies risks

## Options
- `--dry-run`: No side effects at all
- `--verbose`: Show detailed simulation steps
- `--risk-only`: Only show risk assessment

## Example

```bash
# Simulate plan execution
/simulate wf_1234567890_abc

# Full dry run
/simulate wf_1234567890_abc --dry-run

# Risk assessment only
/simulate wf_1234567890_abc --risk-only
```

## Output

```
Simulation: Add user authentication
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Plan Validation: ✓ Valid

Execution Path:
  Phase 1: Setup
    → task_001: Create auth schema (S)

  Phase 2: Implementation
    → task_002: Implement sign-in flow (M)
    → task_003: Add OAuth providers (M) [parallel]

  Phase 3: Testing
    → task_004: Write auth tests (M)

Estimated Resources:
  Duration: 45-60 minutes
  Cost: $15-25 USD
  API calls: ~100

Dependencies Check:
  ✓ All task dependencies satisfied
  ✓ No circular dependencies
  ✓ Parallel tasks identified

Risk Assessment:
  Overall: Medium

  Risks Identified:
  ⚠️ OAuth integration requires env vars
     - GOOGLE_CLIENT_ID
     - GITHUB_CLIENT_ID
     Mitigation: Verify env vars before task_003

  ⚠️ Database migration in task_001
     - Schema changes may affect existing data
     Mitigation: Backup recommended before execution

Approval Points:
  - task_001 (database migration) - requires approval
  - task_003 (external OAuth) - requires approval

Recommendation: Safe to proceed with approval checkpoints
```

## Risk Levels

| Level | Description |
|-------|-------------|
| Low | Routine changes, well-tested patterns |
| Medium | Some external dependencies or migrations |
| High | Production impact, infrastructure changes |
| Critical | Data loss potential, security implications |

## Related Commands
- `/execute` - Run the plan
- `/plan` - Create/view plan
- `/config` - Adjust settings
