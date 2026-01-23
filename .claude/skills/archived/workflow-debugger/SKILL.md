---
name: workflow-debugger
description: Diagnoses failed autonomous runs. Traces execution path, identifies failure point, suggests retry vs escalate.
allowed-tools:
  - Read
  - Grep
  - Glob
---

# Workflow Debugger

Diagnoses failures in autonomous workflow execution and recommends recovery actions.

## When to Use

- Workflow execution fails
- Tasks are blocked unexpectedly
- Agents encounter errors
- Execution takes longer than expected
- Unexpected behavior during execution

## Diagnosis Process

1. **Collect Evidence**
   - Execution logs
   - Error traces
   - Agent messages
   - Checkpoint states

2. **Trace Execution Path**
   - Timeline reconstruction
   - Decision points
   - Branch analysis
   - Resource usage

3. **Identify Root Cause**
   - Error categorization
   - Pattern matching
   - Correlation analysis
   - Impact assessment

4. **Recommend Action**
   - Retry feasibility
   - Rollback necessity
   - Escalation criteria
   - Prevention measures

## Failure Categories

### Task Failures
| Category | Symptoms | Common Causes |
|----------|----------|---------------|
| Execution Error | Non-zero exit code | Code bug, missing dependency |
| Timeout | Task exceeds time limit | Long-running operation, infinite loop |
| Resource Exhaustion | OOM, disk full | Large data, memory leak |
| Permission Denied | Access errors | Missing credentials, wrong permissions |

### Agent Failures
| Category | Symptoms | Common Causes |
|----------|----------|---------------|
| Communication Error | No response | Network issue, agent crash |
| Invalid State | Unexpected behavior | State corruption, race condition |
| Deadlock | Agents waiting indefinitely | Circular dependency |
| Overload | Slow responses | Too many concurrent tasks |

### Workflow Failures
| Category | Symptoms | Common Causes |
|----------|----------|---------------|
| Dependency Cycle | Tasks never start | Circular task dependencies |
| Missing Prerequisite | Task blocked | Incomplete dependencies |
| State Corruption | Inconsistent data | Partial update, crash recovery |
| Budget Exceeded | Execution halted | Cost overrun |

## Output Format

```markdown
## Workflow Diagnosis: [Workflow ID]

### Failure Summary
- **Type**: [Category]
- **Severity**: [Critical/High/Medium/Low]
- **Recoverable**: [Yes/No/Partial]
- **Time to Failure**: [Duration]

### Execution Timeline
```
[T+0:00] Workflow started
[T+5:00] task_001 completed ✓
[T+10:00] task_002 started
[T+12:30] task_002 failed ✗
  └─ Error: [Error message]
```

### Root Cause Analysis

#### Immediate Cause
[What directly caused the failure]

#### Contributing Factors
1. [Factor 1]
2. [Factor 2]

#### Evidence
- Log entry: [relevant log]
- State: [relevant state]
- Metrics: [relevant metrics]

### Recovery Options

#### Option 1: Retry (Recommended)
- **Feasibility**: High
- **Steps**:
  1. [Step]
  2. [Step]
- **Risk**: Low

#### Option 2: Rollback + Retry
- **Feasibility**: Medium
- **Steps**:
  1. Rollback to checkpoint [ID]
  2. Fix [issue]
  3. Resume execution
- **Risk**: Medium

#### Option 3: Manual Intervention
- **Feasibility**: Low
- **Steps**:
  1. [Manual step]
- **Risk**: High

### Prevention Recommendations
1. [Recommendation]
2. [Recommendation]

### Escalation Criteria
- Escalate if: [condition]
- Contact: [team/person]
```

## Recovery Decision Tree

```
Failure Detected
    │
    ├─ Is error transient?
    │   ├─ Yes → Retry with backoff
    │   └─ No ↓
    │
    ├─ Is checkpoint available?
    │   ├─ Yes → Assess rollback
    │   └─ No → Escalate
    │
    ├─ Can issue be auto-fixed?
    │   ├─ Yes → Apply fix, retry
    │   └─ No → Escalate
    │
    └─ Escalate to user
```

## Common Patterns

### Transient Failures (Auto-Retry)
- Network timeouts
- Rate limiting
- Service unavailable
- Lock contention

### Fixable Failures (Auto-Fix + Retry)
- Missing environment variable
- Permission issues (fixable)
- Dependency version mismatch
- Configuration error

### Escalation Required
- Security violations
- Data corruption
- Repeated failures (> max retries)
- Ambiguous requirements
- External service down

## Best Practices

1. **Log Context** - Include relevant state in error logs
2. **Checkpoint Often** - More checkpoints = better recovery
3. **Idempotent Tasks** - Safe to retry
4. **Clear Error Messages** - Specific, actionable
5. **Monitor Patterns** - Track recurring failures
6. **Document Fixes** - Build knowledge base
