# /execute - Execute Workflow

Begin autonomous execution of a workflow plan.

## Usage
```
/execute [plan_id]
```

## Arguments
- `plan_id` (optional): The workflow/plan ID to execute. If not provided, executes the most recent plan.

## Process

1. **Load Plan**
   - Retrieve the workflow plan from storage
   - Validate plan structure and dependencies
   - Check execution mode permissions

2. **Initialize Execution**
   - Set workflow status to "executing"
   - Create initial checkpoint
   - Spawn required agents

3. **Execute Tasks**
   - Process tasks in dependency order
   - Parallelize independent tasks where possible
   - Create checkpoints at configured intervals
   - Handle approval requests based on execution mode

4. **Handle Completion**
   - Create final checkpoint
   - Update workflow status
   - Generate execution summary

## Execution Modes

The execution behavior depends on the current mode:

| Mode | Auto-Approved | Requires Approval |
|------|---------------|-------------------|
| **supervised** | Nothing | All operations |
| **autonomous-low** | Planning, tests, reads | Prod, destructive |
| **autonomous-high** | All dev, previews | Prod deploy, infra |
| **full-auto** | Everything within budget | Kill switch only |

## Options
- `--dry-run`: Validate plan without executing
- `--skip-approval`: Skip approval checks (requires confirmation)
- `--from-task <task_id>`: Start execution from specific task

## Example

```bash
# Execute the most recent plan
/execute

# Execute a specific plan
/execute wf_1234567890_abc123

# Dry run to validate
/execute wf_1234567890_abc123 --dry-run

# Resume from a specific task
/execute wf_1234567890_abc123 --from-task task_001
```

## Output

```
Executing workflow: Add user authentication

Status: executing
Mode: autonomous-low
Budget: $50.00 USD

Tasks:
[✓] task_001: Create auth schema (completed)
[→] task_002: Implement sign-in flow (in_progress)
[ ] task_003: Add OAuth providers (pending)
[ ] task_004: Write auth tests (pending)

Progress: 25% (1/4 tasks)
Checkpoint: cp_1234567890_xyz
```

## Related Commands
- `/plan` - Create execution plan
- `/pause` - Pause execution
- `/status` - Check workflow status
- `/abort` - Cancel execution
