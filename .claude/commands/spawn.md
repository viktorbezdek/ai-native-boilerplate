# /spawn - Spawn Agent

Manually create a new subagent.

## Usage
```
/spawn <agent_type> [config]
```

## Arguments
- `agent_type` (required): Type of agent to spawn
- `config` (optional): JSON configuration for the agent

## Agent Types
- `planner` - Strategic planning and task decomposition
- `developer` - Code implementation with TDD
- `tester` - Test creation and coverage analysis
- `reviewer` - Code review and security audits
- `deployer` - Deployment and release management
- `observer` - System monitoring and telemetry
- `responder` - Incident response and runbooks
- `coordinator` - Workflow orchestration

## Configuration Options

```json
{
  "workflowId": "wf_123",
  "taskId": "task_001",
  "metadata": {
    "priority": "high",
    "context": "specific instructions"
  }
}
```

## Example

```bash
# Spawn a developer agent
/spawn developer

# Spawn with workflow assignment
/spawn developer '{"workflowId": "wf_1234567890_abc"}'

# Spawn tester for specific task
/spawn tester '{"taskId": "task_003"}'
```

## Output

```
Agent spawned: developer_1705312500_xyz

Type: developer
Status: idle
Workflow: wf_1234567890_abc

Capabilities:
  ✓ Read files
  ✓ Write files
  ✓ Edit files
  ✓ Run bash commands
  ✓ Search with grep/glob

Ready for task assignment.
Use /reassign to assign a task.
```

## Limits
- Maximum agents per type: 5 (configurable)
- Idle agents auto-terminate after 5 minutes

## Related Commands
- `/agents` - List agents
- `/terminate` - Stop agent
- `/reassign` - Assign task
