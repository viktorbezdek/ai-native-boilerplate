# /artifacts - List Workflow Artifacts

List generated files and outputs for a workflow or task.

## Usage
```
/artifacts <task_id>
```

## Arguments
- `task_id` (required): Task or workflow ID to list artifacts for.

## Artifact Types
- `file`: Source code files
- `directory`: Created directories
- `log`: Execution logs
- `report`: Generated reports (coverage, analysis)
- `test_result`: Test execution results
- `coverage_report`: Code coverage reports
- `diff`: File change diffs
- `snapshot`: State snapshots
- `backup`: Backup archives

## Options
- `--type <type>`: Filter by artifact type
- `--since <time>`: Show artifacts created since timestamp
- `--json`: Output as JSON

## Example

```bash
# List all artifacts for a task
/artifacts task_003

# Filter by type
/artifacts task_003 --type file

# List workflow artifacts
/artifacts wf_1234567890_abc
```

## Output

```
Artifacts for task_003: Add OAuth providers
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Files Created (3):
  📄 src/lib/auth/providers.ts (2.1 KB)
     Created: 2024-01-15T10:15:10Z

  📄 src/lib/auth/oauth-config.ts (1.5 KB)
     Created: 2024-01-15T10:15:12Z

  📄 src/types/oauth.ts (0.8 KB)
     Created: 2024-01-15T10:15:14Z

Files Modified (1):
  📝 src/lib/auth/index.ts
     Diff: +15 lines, -2 lines

Reports (1):
  📊 coverage-report.html
     Coverage: 85%

Logs (1):
  📋 task_003.log (45 entries)

─────────────────────────────────────────
Total: 6 artifacts | Size: 5.2 KB
```

## Related Commands
- `/logs` - View execution logs
- `/diff` - Compare checkpoints
- `/status` - Workflow status
