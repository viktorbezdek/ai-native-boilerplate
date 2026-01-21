# /abort - Abort Workflow Execution

Cancel workflow execution and preserve artifacts.

## Usage
```
/abort [plan_id]
```

## Arguments
- `plan_id` (optional): Workflow ID to abort. Uses current workflow if not specified.

## Process

1. **Signal Abort**
   - Mark workflow for immediate termination
   - Stop all running tasks

2. **Preserve State**
   - Create final checkpoint
   - Save all artifacts
   - Terminate agents gracefully

3. **Cleanup**
   - Update workflow status to "aborted"
   - Record abort reason and timestamp

## Options
- `--reason <text>`: Record reason for aborting
- `--cleanup`: Remove workflow files after abort

## Example

```bash
# Abort current workflow
/abort

# Abort with reason
/abort --reason "Requirements changed"

# Abort specific workflow
/abort wf_1234567890_abc123
```

## Output

```
Workflow aborted: Add user authentication

Status: aborted
Aborted at: 2024-01-15T10:45:00Z
Reason: Requirements changed

Completed tasks: 2/4
Artifacts preserved: 5 files

Final checkpoint: cp_1234567890_abort

To rollback: /rollback cp_1234567890_start
To cleanup: /abort --cleanup
```

## Notes
- Aborting preserves all artifacts by default
- A final checkpoint is created for potential rollback
- Use `--cleanup` to remove workflow files

## Related Commands
- `/pause` - Pause instead of abort
- `/rollback` - Restore to checkpoint
- `/status` - Check workflow status
