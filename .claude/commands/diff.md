# /diff - Compare Checkpoints

Compare state between two checkpoints.

## Usage
```
/diff <checkpoint_a> <checkpoint_b>
```

## Arguments
- `checkpoint_a` (required): First checkpoint ID (older)
- `checkpoint_b` (required): Second checkpoint ID (newer)

## Process

1. **Load Checkpoints**
   - Retrieve both checkpoint states
   - Validate checkpoint compatibility

2. **Compare States**
   - Diff task statuses
   - Diff file changes
   - Calculate resource deltas

3. **Generate Report**
   - Show tasks completed between checkpoints
   - Show file modifications
   - Show resource usage changes

## Options
- `--files-only`: Show only file changes
- `--tasks-only`: Show only task changes
- `--stats`: Show summary statistics only

## Example

```bash
# Compare two checkpoints
/diff cp_1234567890_abc cp_1234567890_xyz

# Show only file changes
/diff cp_1234567890_abc cp_1234567890_xyz --files-only

# Show summary only
/diff cp_1234567890_abc cp_1234567890_xyz --stats
```

## Output

```
Checkpoint Diff
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

From: cp_1234567890_abc (2024-01-15T09:30:00Z)
To:   cp_1234567890_xyz (2024-01-15T10:30:00Z)

Tasks Changed:
  ✓ task_002: Implement sign-in flow
    pending → completed

  → task_003: Add OAuth providers
    pending → in_progress

Files Changed:
  + src/lib/auth/sign-in.ts (new file, 150 lines)
  + src/lib/auth/session.ts (new file, 80 lines)
  ~ src/lib/auth/index.ts (+25 lines, -5 lines)
  ~ src/lib/db/schema.ts (+15 lines)

Resources:
  Cost:     $5.00 → $12.50 (+$7.50)
  Time:     15m → 45m (+30m)
  API calls: 20 → 45 (+25)

Summary:
  Tasks completed: 1
  Files created: 2
  Files modified: 2
  Cost increase: $7.50
```

## Related Commands
- `/rollback` - Restore to checkpoint
- `/artifacts` - View artifacts
- `/trace` - Execution trace
