# Autonomous Development System — Component Specification

A complete architecture for self-sustaining development workflows.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AUTONOMOUS DEV SYSTEM                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  TRIGGERS          PLANNING           EXECUTION         OBSERVATION         │
│  ─────────         ────────           ─────────         ───────────         │
│  Sentry MCP   →    Architect     →    Dev Agents   →    Telemetry MCP       │
│  GitHub MCP        Subagent           + Tools           + Dashboards        │
│  Schedule MCP                                                               │
│                         ↑                                    │              │
│                         └────────── Feedback Loop ───────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## SKILLS (14 total)

### Planning & Architecture

| Skill | Description |
|-------|-------------|
| **task-decomposer** | Breaks ambiguous requests into dependency-ordered task graphs. Outputs DAGs with parallelization hints, estimated effort, and risk flags. |
| **architecture-advisor** | Evaluates technical decisions against constraints (cost, latency, team size). Recommends patterns: monolith vs microservices, sync vs async, build vs buy. |
| **scope-guardian** | Detects scope creep mid-execution. Compares current work against original spec, flags drift, suggests backlog items vs in-scope adjustments. |

### Development

| Skill | Description |
|-------|-------------|
| **tdd-orchestrator** | Enforces test-first development. Generates test skeletons before implementation, validates coverage thresholds, blocks merges below 80%. |
| **code-synthesizer** | Generates implementation code from specs. Understands 12 languages, respects project conventions, injects proper error handling. |
| **refactor-engine** | Identifies code smells, suggests refactors, executes safe transformations. Tracks technical debt, prioritizes by impact/effort ratio. |

### Quality & Security

| Skill | Description |
|-------|-------------|
| **vulnerability-scanner** | Static analysis for security issues. Checks dependencies (CVEs), code patterns (injection, XSS), secrets in repos. Severity scoring. |
| **test-amplifier** | Generates additional test cases from existing tests. Mutation testing, edge case discovery, property-based test generation. |
| **compliance-checker** | Validates code against regulatory requirements (SOC2, HIPAA, GDPR). Flags violations, suggests remediations. |

### Operations

| Skill | Description |
|-------|-------------|
| **deploy-strategist** | Selects deployment strategy (blue-green, canary, rolling) based on risk profile. Generates rollback plans, defines health checks. |
| **incident-responder** | Runbook execution for production issues. Correlates alerts, suggests root causes, executes predefined remediation steps. |
| **cost-optimizer** | Analyzes cloud spend, identifies waste, suggests right-sizing. Tracks cost per feature, alerts on budget anomalies. |

### Meta

| Skill | Description |
|-------|-------------|
| **workflow-debugger** | Diagnoses failed autonomous runs. Traces execution path, identifies failure point, suggests retry vs escalate. |
| **learning-extractor** | Post-mortem analysis of completed workflows. Extracts patterns for future optimization, updates skill configurations. |

---

## SUBAGENTS (8 total)

### Core Execution Agents

| Subagent | Role | Tools Access | Autonomy Level |
|----------|------|--------------|----------------|
| **Planner** | Decomposes requests into execution plans | task-decomposer, architecture-advisor, scope-guardian | High — can plan without approval |
| **Developer** | Writes and modifies code | code-synthesizer, refactor-engine, bash, file-ops | Medium — checkpoints on major changes |
| **Tester** | Creates and runs tests | tdd-orchestrator, test-amplifier, bash | High — can test freely |
| **Reviewer** | Validates code quality and security | vulnerability-scanner, compliance-checker | High — read-only analysis |

### Operations Agents

| Subagent | Role | Tools Access | Autonomy Level |
|----------|------|--------------|----------------|
| **Deployer** | Manages releases to environments | deploy-strategist, Vercel MCP, K8s MCP | Low — requires approval for prod |
| **Observer** | Monitors running systems | Telemetry MCP, Sentry MCP, cost-optimizer | High — passive observation |
| **Responder** | Handles production incidents | incident-responder, PagerDuty MCP | Medium — can execute runbooks |
| **Coordinator** | Orchestrates other subagents | All skills (read), workflow-debugger | High — manages execution flow |

### Subagent Communication Protocol

```yaml
message_format:
  from: subagent_id
  to: subagent_id | "coordinator" | "user"
  type: request | response | checkpoint | escalation
  payload:
    task_id: string
    status: pending | in_progress | completed | blocked | failed
    artifacts: []
    requires_approval: boolean
    context: {}
```

---

## COMMANDS (22 total)

### Workflow Control

| Command | Syntax | Description |
|---------|--------|-------------|
| `/plan` | `/plan <request>` | Generate execution plan without executing |
| `/execute` | `/execute [plan_id]` | Begin autonomous execution of plan |
| `/pause` | `/pause [task_id]` | Halt execution at next checkpoint |
| `/resume` | `/resume [task_id]` | Continue paused execution |
| `/abort` | `/abort [plan_id]` | Cancel execution, preserve artifacts |
| `/rollback` | `/rollback <checkpoint_id>` | Revert to previous state |

### Inspection

| Command | Syntax | Description |
|---------|--------|-------------|
| `/status` | `/status [plan_id]` | Show current execution state |
| `/logs` | `/logs <task_id> [--tail N]` | View execution logs |
| `/artifacts` | `/artifacts <task_id>` | List generated files/outputs |
| `/diff` | `/diff <checkpoint_a> <checkpoint_b>` | Compare states |
| `/trace` | `/trace <task_id>` | Full execution trace with timing |

### Configuration

| Command | Syntax | Description |
|---------|--------|-------------|
| `/config` | `/config <key> [value]` | Get/set workflow configuration |
| `/approve` | `/approve <level>` | Set auto-approval level (none/low/medium/high) |
| `/budget` | `/budget <amount> [currency]` | Set cost ceiling for execution |
| `/timeout` | `/timeout <duration>` | Set max execution time |

### Agent Control

| Command | Syntax | Description |
|---------|--------|-------------|
| `/agents` | `/agents [--status]` | List active subagents |
| `/spawn` | `/spawn <agent_type> [config]` | Manually spawn subagent |
| `/terminate` | `/terminate <agent_id>` | Stop specific subagent |
| `/reassign` | `/reassign <task_id> <agent_id>` | Move task to different agent |

### Debugging

| Command | Syntax | Description |
|---------|--------|-------------|
| `/diagnose` | `/diagnose <failure_id>` | Run workflow-debugger on failure |
| `/simulate` | `/simulate <plan_id> [--dry-run]` | Test execution without side effects |

---

## MCP SERVERS (12 total)

### Source Control & CI

| MCP Server | Endpoint | Capabilities |
|------------|----------|--------------|
| **github-mcp** | `mcp.github.com/sse` | Repos, PRs, issues, actions, code search, webhooks |
| **gitlab-mcp** | `mcp.gitlab.com/sse` | Repos, MRs, pipelines, registry, releases |
| **circleci-mcp** | `mcp.circleci.com/sse` | Pipeline triggers, job status, artifacts, config validation |

### Deployment & Infrastructure

| MCP Server | Endpoint | Capabilities |
|------------|----------|--------------|
| **vercel-mcp** | `mcp.vercel.com/sse` | Deploy, preview URLs, domains, env vars, logs |
| **kubernetes-mcp** | `mcp.k8s.io/sse` | Deployments, pods, services, configmaps, rollouts |
| **terraform-mcp** | `mcp.terraform.io/sse` | Plan, apply, state, workspaces, drift detection |
| **aws-mcp** | `mcp.aws.amazon.com/sse` | EC2, Lambda, S3, RDS, CloudWatch, IAM |

### Observability

| MCP Server | Endpoint | Capabilities |
|------------|----------|--------------|
| **sentry-mcp** | `mcp.sentry.dev/sse` | Errors, issues, releases, performance, alerts |
| **datadog-mcp** | `mcp.datadoghq.com/sse` | Metrics, traces, logs, dashboards, monitors |
| **telemetry-mcp** | `mcp.opentelemetry.io/sse` | Unified traces, metrics, logs across services |

### Project Management

| MCP Server | Endpoint | Capabilities |
|------------|----------|--------------|
| **asana-mcp** | `mcp.asana.com/sse` | Tasks, projects, portfolios, goals, workload |

### Incident Management

| MCP Server | Endpoint | Capabilities |
|------------|----------|--------------|
| **pagerduty-mcp** | `mcp.pagerduty.com/sse` | Incidents, escalations, schedules, runbooks |

---

## EXECUTION MODES

### Mode: Supervised (Default)

```
User approval required at:
- Plan generation
- Each phase transition
- Any destructive operation
- Production deployments
- Cost > $10
```

### Mode: Autonomous-Low

```
Auto-approved:
- Planning
- Test execution
- Non-prod deployments
- Reads/queries

Requires approval:
- Production changes
- Destructive operations
- Cost > $50
```

### Mode: Autonomous-High

```
Auto-approved:
- All development tasks
- Preview deployments
- Incident response (runbooks only)

Requires approval:
- Production deployments
- Infrastructure changes
- Cost > $100
```

### Mode: Full-Auto (Dangerous)

```
Auto-approved: Everything within budget
Kill switch: /abort or budget exceeded
Use case: Trusted pipelines, scheduled maintenance
```

---

## FEEDBACK LOOPS

### Error → Fix Loop

```
1. sentry-mcp detects error
2. Coordinator spawns Planner
3. Planner creates fix plan
4. Developer implements fix
5. Tester validates
6. Deployer releases (with approval)
7. Observer confirms resolution
8. learning-extractor logs pattern
```

### Performance → Optimize Loop

```
1. telemetry-mcp detects latency regression
2. Observer triggers analysis
3. Planner creates optimization plan
4. Developer implements
5. Observer validates improvement
6. cost-optimizer tracks efficiency gain
```

### Cost → Reduce Loop

```
1. cost-optimizer detects anomaly
2. Coordinator notifies user
3. If approved: Planner creates reduction plan
4. Deployer executes (right-sizing, cleanup)
5. Observer tracks savings
```

---

## STATE MANAGEMENT

### Checkpoint Schema

```typescript
interface Checkpoint {
  id: string;
  workflow_id: string;
  timestamp: ISO8601;
  phase: string;
  task_id: string;
  
  state: {
    completed_tasks: string[];
    pending_tasks: string[];
    blocked_tasks: string[];
    artifacts: Record<string, Artifact>;
  };
  
  agents: {
    active: AgentState[];
    terminated: string[];
  };
  
  resources: {
    cost_incurred: number;
    time_elapsed: number;
    api_calls: number;
  };
  
  rollback: {
    files_backup: string;  // tar.gz path
    db_snapshot?: string;
    config_snapshot: object;
  };
}
```

### Persistence Locations

```
/home/claude/.autonomous/
├── workflows/
│   └── {workflow_id}/
│       ├── plan.json
│       ├── checkpoints/
│       │   └── {checkpoint_id}.json
│       ├── logs/
│       │   └── {task_id}.log
│       └── artifacts/
├── agents/
│   └── {agent_id}.state
└── config.yaml
```

---

## QUICK REFERENCE

```
SKILLS (14):     task-decomposer, architecture-advisor, scope-guardian,
                 tdd-orchestrator, code-synthesizer, refactor-engine,
                 vulnerability-scanner, test-amplifier, compliance-checker,
                 deploy-strategist, incident-responder, cost-optimizer,
                 workflow-debugger, learning-extractor

SUBAGENTS (8):   Planner, Developer, Tester, Reviewer,
                 Deployer, Observer, Responder, Coordinator

COMMANDS (22):   /plan, /execute, /pause, /resume, /abort, /rollback,
                 /status, /logs, /artifacts, /diff, /trace,
                 /config, /approve, /budget, /timeout,
                 /agents, /spawn, /terminate, /reassign,
                 /diagnose, /simulate

MCP SERVERS (11): github-mcp, gitlab-mcp, circleci-mcp,
                  vercel-mcp, kubernetes-mcp, terraform-mcp, aws-mcp,
                  sentry-mcp, datadog-mcp, telemetry-mcp,
                  asana-mcp, pagerduty-mcp
```