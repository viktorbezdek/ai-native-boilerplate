# /diagnose - Diagnose Failure

Run workflow-debugger on a failure to identify root cause.

## Usage
```
/diagnose <failure_id>
```

## Arguments
- `failure_id` (required): Task ID, workflow ID, or error ID to diagnose

## Process

1. **Collect Evidence**
   - Gather execution logs
   - Collect error traces
   - Review recent changes

2. **Analyze Failure**
   - Identify failure point
   - Trace execution path
   - Check dependencies

3. **Generate Report**
   - Root cause analysis
   - Contributing factors
   - Suggested remediation

## Diagnosis Types

| Type | Triggers |
|------|----------|
| Task Failure | Task status = failed |
| Workflow Blocked | No executable tasks |
| Agent Error | Agent error count > 0 |
| Timeout | Execution exceeded limit |
| Budget Exceeded | Cost > budget |

## Options
- `--verbose`: Include all debug information
- `--suggestions`: Focus on remediation suggestions
- `--export`: Export diagnosis report

## Example

```bash
# Diagnose failed task
/diagnose task_003

# Diagnose workflow failure
/diagnose wf_1234567890_abc

# Verbose diagnosis
/diagnose task_003 --verbose
```

## Output

```
Diagnosis Report: task_003
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Failure Type: Task Execution Error
Severity: High
Recoverable: Yes

Timeline:
  10:15:00  Task started
  10:15:05  Read src/lib/auth/index.ts ✓
  10:15:10  Write src/lib/auth/oauth.ts ✓
  10:15:15  Run type check ✗ ERROR

Error Details:
  Command: bun typecheck
  Exit code: 1
  Output:
    src/lib/auth/oauth.ts:15:3
    Type 'string' is not assignable to type 'OAuthProvider'

Root Cause:
  Type mismatch in OAuth provider configuration.
  The provider name was passed as a string literal
  instead of using the OAuthProvider enum.

Contributing Factors:
  1. Missing type import in oauth.ts
  2. No type validation before assignment

Suggested Remediation:
  1. Add import: import { OAuthProvider } from './types'
  2. Use enum: OAuthProvider.GOOGLE instead of 'google'
  3. Re-run type check to verify fix

Retry Recommendation: Yes
  - Fix type error
  - Re-run from task_003
  - Command: /resume --from-checkpoint cp_before_task_003
```

## Related Commands
- `/logs` - View execution logs
- `/trace` - Execution trace
- `/rollback` - Restore checkpoint
