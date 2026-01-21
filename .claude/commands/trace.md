# /trace - Execution Trace

Full execution trace with timing for a task or workflow.

## Usage
```
/trace <task_id>
```

## Arguments
- `task_id` (required): Task or workflow ID to trace.

## Process

1. **Collect Events**
   - Gather all execution events
   - Include agent activities
   - Include tool invocations

2. **Build Timeline**
   - Order events chronologically
   - Calculate durations
   - Identify bottlenecks

3. **Generate Report**
   - Visual timeline
   - Performance metrics
   - Dependency graph

## Options
- `--timeline`: Show visual timeline
- `--flamegraph`: Generate flamegraph output
- `--json`: Output as JSON
- `--verbose`: Include debug-level events

## Example

```bash
# Trace a task
/trace task_003

# Trace entire workflow
/trace wf_1234567890_abc

# Verbose trace
/trace task_003 --verbose
```

## Output

```
Execution Trace: task_003 (Add OAuth providers)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Timeline:
┌─────────────────────────────────────────────────────────────┐
│ 10:15:00 ├──── task_started ────────────────────────────────│
│ 10:15:01 ├── read_file (index.ts) ──┤                       │
│ 10:15:05 ├──────── analyze ─────────┤                       │
│ 10:15:10 ├────── write_file (providers.ts) ─────┤           │
│ 10:15:15 ├── write_file (oauth-config.ts) ──┤               │
│ 10:15:20 ├────── edit_file (index.ts) ──────┤               │
│ 10:15:25 ├──── type_check ────┤                             │
│ 10:15:30 ├── task_completed ───────────────────────────────│
└─────────────────────────────────────────────────────────────┘

Events (8 total):
  10:15:00.000  task_started      developer_001
  10:15:01.234  tool_invoked      Read (index.ts)          234ms
  10:15:05.456  tool_invoked      Grep (OAuth patterns)    4.2s
  10:15:10.123  tool_invoked      Write (providers.ts)     4.7s
  10:15:15.789  tool_invoked      Write (oauth-config.ts)  5.7s
  10:15:20.012  tool_invoked      Edit (index.ts)          4.2s
  10:15:25.345  tool_invoked      Bash (bun typecheck)     5.3s
  10:15:30.678  task_completed    developer_001

Performance:
  Total duration: 30.7s
  Longest operation: Write (providers.ts) - 4.7s
  Tool invocations: 6
  Agent switches: 0

Dependencies:
  task_001 (Create auth schema) ← task_003
  task_002 (Implement sign-in flow) ← task_003
```

## Related Commands
- `/logs` - View execution logs
- `/status` - Workflow status
- `/diagnose` - Analyze failures
