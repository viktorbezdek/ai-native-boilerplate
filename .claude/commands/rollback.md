# /rollback - Rollback to Checkpoint

Revert workflow state to a previous checkpoint.

## Usage
```
/rollback <checkpoint_id>
```

## Arguments
- `checkpoint_id` (required): The checkpoint ID to restore to.

## Process

1. **Validate Checkpoint**
   - Verify checkpoint exists and is valid
   - Check rollback capability
   - Warn about data that will be lost

2. **Restore State**
   - Restore files from backup
   - Reset task statuses
   - Restore configuration

3. **Update Workflow**
   - Set checkpoint as current state
   - Clear tasks completed after checkpoint
   - Log rollback event

## Options
- `--dry-run`: Preview changes without applying
- `--files-only`: Only restore file changes
- `--skip-confirm`: Skip confirmation prompt

## Example

```bash
# Rollback to specific checkpoint
/rollback cp_1234567890_abc

# Preview rollback changes
/rollback cp_1234567890_abc --dry-run

# Restore only files
/rollback cp_1234567890_abc --files-only
```

## Output

```
Rolling back to checkpoint: cp_1234567890_abc

Checkpoint details:
  Created: 2024-01-15T09:30:00Z
  Phase: after_task_002
  Tasks completed: 2

Changes to revert:
  - task_003: Add OAuth providers (completed → pending)
  - task_004: Write auth tests (in_progress → pending)

Files to restore:
  - src/lib/auth/oauth.ts (modified → original)
  - src/lib/auth/providers.ts (created → removed)

Confirm rollback? [y/N]

✓ Rollback completed
  Files restored: 2
  Tasks reset: 2
  Current checkpoint: cp_1234567890_abc
```

## Notes
- Rollback creates a new checkpoint before restoring
- Some changes may not be reversible (external API calls)
- Use `--dry-run` to preview before applying

## Related Commands
- `/diff` - Compare checkpoints
- `/status` - Check workflow status
- `/artifacts` - View checkpoint artifacts
