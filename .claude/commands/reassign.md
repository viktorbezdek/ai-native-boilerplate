# /reassign - Reassign Task

Move a task to a different agent.

## Usage
```
/reassign <task_id> <agent_id>
```

## Arguments
- `task_id` (required): ID of the task to reassign
- `agent_id` (required): ID of the target agent

## Process

1. **Validate**
   - Check task exists and is assignable
   - Check target agent is available
   - Verify agent type is compatible

2. **Transfer**
   - Remove task from current agent
   - Assign to target agent
   - Transfer context and artifacts

3. **Resume**
   - Target agent continues from current state
   - Progress is preserved

## Valid Reassignments

| From | To | Allowed |
|------|-----|---------|
| developer | developer | ✓ |
| developer | tester | ✗ (different type) |
| pending | any compatible | ✓ |
| completed | any | ✗ (already done) |

## Options
- `--force`: Force reassignment even if agent is busy

## Example

```bash
# Reassign task to different developer
/reassign task_003 developer_1705312300_xyz

# Reassign blocked task
/reassign task_003 developer_1705312400_abc
```

## Output

```
Reassigning task: task_003

From: developer_1705312200_abc (busy)
To:   developer_1705312300_xyz (idle)

Task: Add OAuth providers
Status: in_progress → in_progress

Context transferred:
  - 3 files read
  - 2 files created
  - Analysis complete

✓ Task reassigned
  developer_1705312300_xyz now working on task_003
```

## Incompatible Agent Warning

```
⚠️ Incompatible agent type

Task: task_003 (Add OAuth providers)
Required: developer
Target: tester_1705312100_def

Testers cannot perform development tasks.
Available developers:
  - developer_1705312300_xyz (idle)
  - developer_1705312400_abc (idle)
```

## Related Commands
- `/agents` - List agents
- `/spawn` - Create agent
- `/terminate` - Stop agent
