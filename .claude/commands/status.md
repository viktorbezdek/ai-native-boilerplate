# /status - Workflow Status

Show current execution state of a workflow.

## Usage
```
/status [plan_id]
```

## Arguments
- `plan_id` (optional): Workflow ID to check. Shows current workflow if not specified.

## Output Sections

### Workflow Summary
- ID, title, and description
- Current status (pending, executing, paused, completed, failed, aborted)
- Execution mode and budget

### Progress
- Tasks completed vs total
- Current phase
- Estimated completion

### Task Details
- List of tasks with status icons
- Currently executing task
- Blocked tasks and reasons

### Resource Usage
- Cost incurred
- Time elapsed
- API calls made

### Checkpoints
- Latest checkpoint ID
- Total checkpoints created

## Example

```bash
# Check current workflow
/status

# Check specific workflow
/status wf_1234567890_abc123
```

## Output

```
Workflow Status: Add user authentication
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ID: wf_1234567890_abc123
Status: executing
Mode: autonomous-low
Budget: $50.00 USD ($12.50 used)

Progress: ████████░░░░░░░░ 50% (2/4 tasks)
Phase: implementation
Started: 2024-01-15T09:00:00Z
ETA: ~15 minutes

Tasks:
  [✓] task_001: Create auth schema
  [✓] task_002: Implement sign-in flow
  [→] task_003: Add OAuth providers (in_progress)
  [ ] task_004: Write auth tests (pending)

Resources:
  Cost: $12.50 / $50.00
  Time: 25 minutes
  API calls: 45

Active Agents:
  - developer_001 (busy) → task_003
  - tester_001 (idle)

Checkpoints: 3
  Latest: cp_1234567890_xyz (5 min ago)
```

## Related Commands
- `/logs` - View execution logs
- `/trace` - Detailed execution trace
- `/agents` - List active agents
