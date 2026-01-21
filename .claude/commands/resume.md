# /resume - Resume Workflow Execution

Continue execution of a paused workflow.

## Usage
```
/resume [task_id]
```

## Arguments
- `task_id` (optional): Specific task or workflow ID to resume. Uses current workflow if not specified.

## Process

1. **Load State**
   - Retrieve workflow from storage
   - Load latest checkpoint if resuming from checkpoint
   - Validate state consistency

2. **Restore Context**
   - Re-spawn required agents
   - Restore execution mode settings
   - Resume from last completed task

3. **Continue Execution**
   - Process remaining tasks
   - Create checkpoints at intervals
   - Handle approval requests

## Options
- `--from-checkpoint <id>`: Resume from a specific checkpoint
- `--skip-approval`: Skip approval checks for blocked tasks

## Example

```bash
# Resume current workflow
/resume

# Resume specific workflow
/resume wf_1234567890_abc123

# Resume from a specific checkpoint
/resume --from-checkpoint cp_1234567890_xyz
```

## Output

```
Resuming workflow: Add user authentication

Previous status: paused
Paused at: 2024-01-15T10:30:00Z
Resuming from: task_003 (Add OAuth providers)

Status: executing
Mode: autonomous-low

Progress: 50% → ...
```

## Notes
- Resuming continues from where execution left off
- Use `--from-checkpoint` to restore to a previous state
- Agents are automatically respawned as needed

## Related Commands
- `/pause` - Pause execution
- `/rollback` - Restore to checkpoint
- `/status` - Check workflow status
