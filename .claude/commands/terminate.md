# /terminate - Terminate Agent

Stop a specific subagent.

## Usage
```
/terminate <agent_id>
```

## Arguments
- `agent_id` (required): ID of the agent to terminate

## Process

1. **Signal Termination**
   - Mark agent for termination
   - Wait for current operation to complete (unless --force)

2. **Cleanup**
   - Unsubscribe from message bus
   - Release assigned tasks
   - Remove from registry

3. **Reassignment**
   - Blocked tasks marked as pending
   - Can be reassigned to other agents

## Options
- `--force`: Terminate immediately without waiting
- `--reassign <agent_id>`: Reassign current task to another agent

## Example

```bash
# Terminate agent
/terminate developer_1705312200_abc

# Force terminate
/terminate developer_1705312200_abc --force

# Terminate and reassign task
/terminate developer_1705312200_abc --reassign developer_1705312300_xyz
```

## Output

```
Terminating agent: developer_1705312200_abc

Status: busy → terminating
Current task: task_003 (Add OAuth providers)

Waiting for current operation to complete...

✓ Agent terminated
  Messages processed: 45
  Tasks completed: 2
  Uptime: 55 minutes

Task task_003 returned to pending queue.
```

## Force Termination Warning

```
⚠️ Force terminating agent with active task

Agent: developer_1705312200_abc
Task: task_003 (Add OAuth providers)
Status: in_progress

This may leave the task in an inconsistent state.
Consider using /rollback after termination.

Proceed? [y/N]
```

## Related Commands
- `/agents` - List agents
- `/spawn` - Create agent
- `/reassign` - Move task
