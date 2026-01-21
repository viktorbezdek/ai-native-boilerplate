# /pause - Pause Workflow Execution

Halt workflow execution at the next checkpoint.

## Usage
```
/pause [task_id]
```

## Arguments
- `task_id` (optional): Specific task to pause after. If not provided, pauses at next checkpoint.

## Process

1. **Signal Pause**
   - Mark workflow as pending pause
   - Wait for current task to complete (unless --immediate)

2. **Create Checkpoint**
   - Save current execution state
   - Backup modified files
   - Record agent states

3. **Update Status**
   - Set workflow status to "paused"
   - Record pause timestamp and reason

## Options
- `--immediate`: Pause immediately without waiting for task completion
- `--reason <text>`: Record reason for pausing

## Example

```bash
# Pause at next checkpoint
/pause

# Pause after specific task
/pause task_003

# Immediate pause with reason
/pause --immediate --reason "Need to review changes"
```

## Output

```
Workflow paused: Add user authentication

Status: paused
Paused at: 2024-01-15T10:30:00Z
Reason: User requested pause

Last completed task: task_002 (Implement sign-in flow)
Checkpoint created: cp_1234567890_abc

Progress: 50% (2/4 tasks)

To resume: /resume wf_1234567890_xyz
```

## Notes
- Pausing creates a checkpoint automatically
- Use `/resume` to continue execution
- Use `/rollback` to revert to a previous checkpoint

## Related Commands
- `/resume` - Continue execution
- `/status` - Check workflow status
- `/abort` - Cancel execution
