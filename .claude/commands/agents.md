# /agents - List Active Agents

List all active subagents and their status.

## Usage
```
/agents [--status]
```

## Options
- `--status`: Include detailed status for each agent
- `--type <type>`: Filter by agent type
- `--workflow <id>`: Filter by workflow

## Agent Types

| Type | Role | Capabilities |
|------|------|--------------|
| `planner` | Task decomposition, architecture | Read, Grep, Glob, WebSearch |
| `developer` | Code implementation, TDD | Read, Write, Edit, Bash |
| `tester` | Test creation, coverage | Read, Write, Edit, Bash |
| `reviewer` | Code review, security | Read, Grep, Glob, Bash |
| `deployer` | Deployments, releases | Read, Bash, MCP tools |
| `observer` | Monitoring, telemetry | Read, MCP tools |
| `responder` | Incident response | Read, Bash, MCP tools |
| `coordinator` | Orchestration | All skills, workflow control |

## Example

```bash
# List all agents
/agents

# With detailed status
/agents --status

# Filter by type
/agents --type developer
```

## Output

```
Active Agents
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ID                          Type        Status   Task
─────────────────────────────────────────────────────
developer_1705312200_abc    developer   busy     task_003
developer_1705312300_xyz    developer   idle     -
tester_1705312100_def       tester      idle     -
reviewer_1705312400_ghi     reviewer    waiting  task_002

Summary:
  Total: 4 agents
  Busy: 1
  Idle: 2
  Waiting: 1
  Errors: 0
```

## Detailed Status

```
/agents --status

Agent: developer_1705312200_abc
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Type: developer
Status: busy
Current Task: task_003 (Add OAuth providers)
Workflow: wf_1234567890_abc

Spawned: 2024-01-15T09:30:00Z
Last Activity: 2024-01-15T10:25:00Z

Messages: 45
Errors: 0

Tools Used:
  Read: 12 calls
  Write: 5 calls
  Edit: 8 calls
  Bash: 3 calls
```

## Related Commands
- `/spawn` - Create new agent
- `/terminate` - Stop agent
- `/reassign` - Move task to agent
