# /timeout - Set Execution Timeout

Set the maximum execution time for a workflow.

## Usage
```
/timeout <duration>
```

## Arguments
- `duration` (required): Maximum execution time

## Duration Formats
- `30m` - 30 minutes
- `2h` - 2 hours
- `1d` - 1 day
- `90` - 90 minutes (default unit)

## Process

1. **Set Limit**
   - Store timeout configuration
   - Start tracking execution time

2. **Monitor Progress**
   - Track elapsed time
   - Warn at 80% threshold
   - Pause at 100% threshold

3. **Enforcement**
   - Create checkpoint at timeout
   - Pause workflow
   - Preserve all progress

## Example

```bash
# Set 1 hour timeout
/timeout 1h

# Set 30 minute timeout
/timeout 30m

# Set 2 hour timeout
/timeout 120

# No timeout
/timeout unlimited
```

## Output

```
Timeout set: 1 hour

Current elapsed: 25 minutes (42%)

Thresholds:
  ⚪ 50% (30m) - Milestone log
  ⚪ 80% (48m) - Warning
  ⚪ 95% (57m) - Consider pausing
  ⚪ 100% (60m) - Auto-pause

Remaining: 35 minutes
```

## Timeout Behavior

When timeout is reached:
1. Current task completes (if possible)
2. Checkpoint is created
3. Workflow status set to "paused"
4. User notified

To continue after timeout:
```bash
/timeout 2h    # Extend timeout
/resume        # Continue execution
```

## Related Commands
- `/config` - All configuration
- `/pause` - Manual pause
- `/status` - Check elapsed time
