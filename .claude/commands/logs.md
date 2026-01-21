# /logs - View Execution Logs

View execution logs for a task or workflow.

## Usage
```
/logs <task_id> [--tail N]
```

## Arguments
- `task_id` (required): Task ID to view logs for.
- `--tail N` (optional): Show last N lines only.

## Process

1. **Locate Logs**
   - Find log file for specified task
   - Load log entries with timestamps

2. **Format Output**
   - Display chronological entries
   - Highlight errors and warnings
   - Show agent attributions

## Options
- `--tail <N>`: Show last N lines
- `--level <level>`: Filter by log level (debug, info, warn, error)
- `--agent <id>`: Filter by agent
- `--since <time>`: Show logs since timestamp
- `--follow`: Stream new log entries (like tail -f)

## Example

```bash
# View all logs for a task
/logs task_003

# View last 50 lines
/logs task_003 --tail 50

# Filter errors only
/logs task_003 --level error

# Follow new entries
/logs task_003 --follow
```

## Output

```
Logs for task_003: Add OAuth providers
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[2024-01-15T10:15:00Z] INFO  [developer_001] Task started
[2024-01-15T10:15:01Z] DEBUG [developer_001] Reading src/lib/auth/index.ts
[2024-01-15T10:15:05Z] INFO  [developer_001] Creating OAuth provider config
[2024-01-15T10:15:10Z] DEBUG [developer_001] Writing src/lib/auth/providers.ts
[2024-01-15T10:15:15Z] WARN  [developer_001] Missing GOOGLE_CLIENT_ID env var
[2024-01-15T10:15:20Z] INFO  [developer_001] OAuth config created with 2 providers
[2024-01-15T10:15:25Z] DEBUG [developer_001] Running type check
[2024-01-15T10:15:30Z] INFO  [developer_001] Task completed successfully

─────────────────────────────────────
Total: 8 entries | Warnings: 1 | Errors: 0
```

## Log Levels
- `DEBUG`: Detailed debugging information
- `INFO`: General progress information
- `WARN`: Warning conditions
- `ERROR`: Error conditions

## Related Commands
- `/status` - Workflow status overview
- `/trace` - Detailed execution trace
- `/diagnose` - Analyze failures
