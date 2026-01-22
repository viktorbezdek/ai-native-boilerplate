# AI Infrastructure

This guide covers the AI-native development infrastructure built into this boilerplate. You'll learn how to use Claude Code effectively, configure the autonomous system, and optimize AI-assisted workflows.

## Overview

The boilerplate includes three AI infrastructure layers:

| Layer | Purpose | Location |
|-------|---------|----------|
| **Claude Code Integration** | Slash commands, agents, hooks | `.claude/` |
| **Autonomous System** | Self-improving development loop | `packages/autonomous/` |
| **Memory System** | Persistent AI context | `.claude/memory/` |

## Claude Code Integration

### Configuration Files

```
.claude/
├── settings.json          # Main configuration
├── commands/              # 32 slash commands
├── agents/                # 11 specialized agents
├── skills/                # 19 development patterns
├── hooks/                 # 15 lifecycle hooks
├── docs/                  # AI-readable documentation
└── memory/                # Persistent memory storage
```

### Slash Commands

Commands are invoked with `/command-name` in Claude Code. Here are the most useful:

#### Planning & Analysis

| Command | Description | Example Use |
|---------|-------------|-------------|
| `/plan` | Decompose requirements into tasks | `/plan Add user notifications` |
| `/analyze` | Analyze codebase patterns | `/analyze src/lib/auth` |
| `/audit` | Security and accessibility audit | `/audit` |

#### Implementation

| Command | Description | Example Use |
|---------|-------------|-------------|
| `/implement` | Generate code with TDD | `/implement user notification system` |
| `/fix-issue` | Analyze and fix GitHub issues | `/fix-issue #123` |
| `/refactor` | Improve code without changing behavior | `/refactor src/components/dashboard` |

#### Testing & Quality

| Command | Description | Example Use |
|---------|-------------|-------------|
| `/test` | Run tests with coverage analysis | `/test` |
| `/review` | Code review for security and quality | `/review` |
| `/benchmark` | Run performance benchmarks | `/benchmark` |

#### Deployment

| Command | Description | Example Use |
|---------|-------------|-------------|
| `/deploy` | Deploy to Vercel | `/deploy preview` |
| `/release` | Version bump and changelog | `/release minor` |

### Specialized Agents

Agents are spawned automatically based on task type. You can also invoke them directly:

```
Use the developer agent to implement the user profile feature
```

| Agent | Expertise | When Used |
|-------|-----------|-----------|
| `developer` | TDD, clean code, type safety | Code implementation |
| `tester` | Test creation, coverage, E2E | Quality assurance |
| `reviewer` | Security, accessibility, performance | Code review |
| `deployer` | Vercel, rollbacks, health checks | Deployments |
| `planner` | Task decomposition, architecture | Planning |
| `optimizer` | Configuration tuning, performance | System improvement |
| `analyst` | PostHog, metrics, user behavior | Analytics |
| `auditor` | Independent security audits | Compliance |
| `coordinator` | Multi-agent orchestration | Complex tasks |
| `observer` | Monitoring, anomaly detection | Operations |
| `responder` | Incident response, runbooks | Emergencies |

### Lifecycle Hooks

Hooks run automatically at specific points in the development cycle:

#### Pre-Tool Hooks

Run before Claude Code executes a tool:

| Hook | Purpose |
|------|---------|
| `guard-protected.sh` | Blocks changes to `.env`, migrations, keys |
| `validate-command.sh` | Prevents dangerous shell commands |
| `telemetry.sh` | Tracks tool usage patterns |
| `start-timing.sh` | Records execution start time |

#### Post-Tool Hooks

Run after tool execution:

| Hook | Purpose |
|------|---------|
| `format.sh` | Auto-formats modified files with Biome |
| `run-tests.sh` | Runs relevant tests after code changes |
| `track-quality.sh` | Captures test/lint/build results |
| `track-drift.sh` | Detects scope creep from planned tasks |
| `track-execution.sh` | Logs execution outcomes |

#### Session Hooks

| Hook | When | Purpose |
|------|------|---------|
| `setup.sh` | Project init | Initialize project configuration |
| `claude-mem.sh` | Session start/end | Manage memory worker |
| `log-session.sh` | Session start | Log session metadata |
| `session-summary.sh` | Session end | Generate summary report |

### Customizing Hooks

Edit `.claude/settings.json` to modify hook behavior:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/format.sh \"$CLAUDE_FILE_PATHS\""
          }
        ]
      }
    ]
  }
}
```

Hook environment variables:
- `$CLAUDE_TOOL_NAME` - Name of executed tool
- `$CLAUDE_FILE_PATHS` - Affected file paths
- `$CLAUDE_TOOL_INPUT` - Tool input JSON
- `$CLAUDE_TOOL_RESULT` - Tool output

## Autonomous System

The `@repo/autonomous` package implements a closed-loop development system that can sense problems, plan fixes, and execute improvements autonomously.

### Architecture

```
┌─────────┐     ┌─────────┐     ┌──────┐     ┌───────┐
│  SENSE  │────▶│ ANALYZE │────▶│ PLAN │────▶│ BUILD │
└─────────┘     └─────────┘     └──────┘     └───────┘
     ▲                                            │
     │                                            ▼
┌─────────┐     ┌───────┐     ┌─────────┐    ┌────────┐
│ EVOLVE  │◀────│ LEARN │◀────│ MONITOR │◀───│ VERIFY │
└─────────┘     └───────┘     └─────────┘    └────────┘
                                                  │
                                                  ▼
                                             ┌────────┐
                                             │ DEPLOY │
                                             └────────┘
```

### Confidence Engine

The confidence engine determines whether actions can be executed autonomously.

#### Signal Sources

| Source | Weight | What It Measures |
|--------|--------|------------------|
| `tests` | 0.25 | Test pass rate + coverage |
| `lint` | 0.15 | Linting errors and warnings |
| `build` | 0.20 | Build success/failure |
| `history` | 0.15 | Past execution success rate |
| `benchmark` | 0.10 | Performance against baselines |
| `review` | 0.15 | Task priority and complexity |

#### Decision Thresholds

| Score | Decision | Behavior |
|-------|----------|----------|
| 95-100 | `auto-execute` | Execute without human intervention |
| 80-94 | `notify` | Execute and notify human |
| 60-79 | `require-approval` | Wait for human approval |
| 0-59 | `escalate` | Escalate to human review |

#### Configuring Thresholds

```typescript
// packages/autonomous/src/types/confidence.ts
export const DEFAULT_CONFIDENCE_CONFIG = {
  thresholds: {
    autoExecute: 95,
    notify: 80,
    requireApproval: 60,
  },
  weights: {
    tests: 0.25,
    lint: 0.15,
    build: 0.20,
    history: 0.15,
    benchmark: 0.10,
    review: 0.15,
  },
  minSignals: 3,
  maxSignalAge: 24 * 60 * 60 * 1000, // 24 hours
};
```

### Signal Processor

Gathers signals from multiple sources:

#### Local Adapter

Reads from log files in `.claude/logs/`:

```
.claude/logs/
├── quality.jsonl      # Test, lint, build results
├── executions.jsonl   # Past execution records
├── drift.jsonl        # Scope drift events
└── benchmarks/        # Benchmark results
```

#### External Adapters

| Adapter | Data Source | What It Provides |
|---------|-------------|------------------|
| `sentry-adapter.ts` | Sentry API | Error rates, new issues |
| `posthog-adapter.ts` | PostHog API | User behavior, feature usage |
| `vercel-adapter.ts` | Vercel API | Deployment status, logs |

Configure adapters via environment variables:

```bash
# .env.local
SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=...
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project

NEXT_PUBLIC_POSTHOG_KEY=phc_...
POSTHOG_PERSONAL_API_KEY=...

VERCEL_TOKEN=...
VERCEL_TEAM_ID=...
```

### Trigger Engine

Triggers initiate autonomous actions based on conditions:

#### Trigger Types

| Type | Example | Use Case |
|------|---------|----------|
| `scheduled` | Every 15 minutes | Regular health checks |
| `threshold` | Error rate > 5% | Reactive fixes |
| `event` | Deployment complete | Post-deploy verification |

#### Example Triggers

```typescript
// Scheduled quality check
{
  type: 'scheduled',
  schedule: '*/15 * * * *',
  action: 'runQualityCheck'
}

// Error rate threshold
{
  type: 'threshold',
  metric: 'errorRate',
  condition: 'gt',
  value: 0.05,
  action: 'spawnResponder'
}

// Post-deploy verification
{
  type: 'event',
  event: 'deployment.complete',
  action: 'runSmokeTests'
}
```

### Learning Engine

Extracts patterns from execution history to improve future decisions.

#### What It Learns

- **Success patterns**: Which approaches work for specific task types
- **Failure patterns**: Common mistakes to avoid
- **Timing patterns**: Optimal times for different operations
- **Skill scores**: Agent effectiveness by task type

#### Configuration Evolution

The learning engine can propose configuration changes:

```typescript
// Auto-generated proposal
{
  target: 'confidence.thresholds.autoExecute',
  currentValue: 95,
  proposedValue: 92,
  reasoning: 'Last 50 executions at 92-95 confidence all succeeded',
  autoApply: false
}
```

### Using the Orchestrator

#### Starting the Autonomous Loop

```typescript
import { getOrchestrator } from '@repo/autonomous';

const orchestrator = getOrchestrator({
  senseInterval: 60000,  // Check every minute
  dryRun: true,          // Log actions without executing
  enableAutoEvolution: false,
});

await orchestrator.start();
```

#### Monitoring Status

```typescript
const status = orchestrator.getStatus();
// { status: 'running', phase: 'sense', iterations: 42 }

const metrics = orchestrator.getMetrics();
// { autonomousExecutionRate: 78, successRate: 96, ... }
```

#### Manual Triggers

```typescript
// Force learning extraction
await orchestrator.triggerLearning();

// Run benchmarks
await orchestrator.runBenchmark('feature-implementation');
```

## Memory System

The memory system (`claude-mem`) provides persistent context across Claude Code sessions.

### How It Works

1. **Capture**: Hooks capture tool observations during sessions
2. **Store**: Observations stored in `.claude/memory/claude-mem.db`
3. **Index**: Vector embeddings enable semantic search
4. **Retrieve**: Relevant context loaded at session start

### Managing Memory

```bash
# Check status
bun memory:status

# Start worker (usually automatic)
bun memory:start

# Stop worker
bun memory:stop
```

### Memory Configuration

Edit `.claude/settings.json`:

```json
{
  "plugins": {
    "claude-mem": {
      "enabled": true,
      "dataDir": ".claude/memory",
      "workerPort": 37778,
      "scope": "project"
    }
  }
}
```

### Searching Memory

Within Claude Code:

```
/memory search authentication implementation
```

Returns relevant observations from past sessions.

## Optimizing AI Infrastructure

### Performance Tuning

#### 1. Reduce Signal Latency

Lower the sense interval for faster reactions:

```typescript
const orchestrator = getOrchestrator({
  senseInterval: 30000, // 30 seconds instead of 60
});
```

#### 2. Adjust Confidence Thresholds

For more aggressive automation:

```typescript
// Lower auto-execute threshold
thresholds: {
  autoExecute: 90,  // Was 95
  notify: 75,       // Was 80
}
```

For more conservative behavior:

```typescript
thresholds: {
  autoExecute: 98,
  notify: 90,
}
```

#### 3. Weight Adjustments

Prioritize certain signals:

```typescript
// Prioritize test results
weights: {
  tests: 0.35,  // Was 0.25
  lint: 0.10,   // Was 0.15
  // ...
}
```

### Reducing Noise

#### Filter Low-Value Signals

```typescript
// In signal adapter
const filtered = signals.filter(s =>
  s.priority !== 'low' &&
  s.confidence > 0.5
);
```

#### Increase Minimum Signals

```typescript
// Require more evidence before acting
minSignals: 5,  // Was 3
```

### Memory Optimization

#### Limit Memory Size

```bash
# Prune old memories (keep last 30 days)
sqlite3 .claude/memory/claude-mem.db \
  "DELETE FROM observations WHERE timestamp < datetime('now', '-30 days')"
```

#### Disable Memory for Sensitive Projects

```json
{
  "plugins": {
    "claude-mem": {
      "enabled": false
    }
  }
}
```

## Troubleshooting

### Autonomous System Not Triggering

1. Check if orchestrator is running:
   ```typescript
   orchestrator.getStatus()
   ```

2. Verify signals are being collected:
   ```bash
   cat .claude/logs/quality.jsonl | tail -5
   ```

3. Check confidence scores are above thresholds:
   ```typescript
   const result = await confidenceEngine.calculateConfidence(task);
   console.log(result.score, result.decision);
   ```

### Memory Not Persisting

1. Check worker status:
   ```bash
   bun memory:status
   ```

2. Verify database exists:
   ```bash
   ls -la .claude/memory/
   ```

3. Restart memory worker:
   ```bash
   bun memory:stop
   bun memory:start
   ```

### Hooks Not Running

1. Check hook configuration in `.claude/settings.json`

2. Verify hook files are executable:
   ```bash
   chmod +x .claude/hooks/*.sh
   ```

3. Test hook manually:
   ```bash
   .claude/hooks/format.sh "src/lib/auth/index.ts"
   ```

## Best Practices

### 1. Start Conservative

Begin with high thresholds and gradually lower as you gain confidence:

```typescript
// Week 1: Conservative
autoExecute: 98

// Week 2: After observing success
autoExecute: 95

// Week 3: Production-ready
autoExecute: 92
```

### 2. Monitor Everything

Enable all tracking hooks and review logs regularly:

```bash
# Daily log review
tail -100 .claude/logs/quality.jsonl | jq '.tests'
```

### 3. Keep Memory Clean

Regularly prune irrelevant memories to maintain search quality.

### 4. Version Control AI Config

Commit `.claude/settings.json` and hook files so team members share configurations.

### 5. Test Before Automating

Use `dryRun: true` to observe what would happen before enabling autonomous execution.
