---
name: autonomous
description: Control the autonomous orchestrator system
arguments:
  - name: action
    description: "Action to perform: start, stop, status, benchmark, learn, evolve"
    required: true
---

# Autonomous Orchestrator Commands

Control the self-developing autonomous system.

## Usage

```bash
/autonomous <action> [options]
```

## Actions

### `start`
Start the autonomous orchestrator. Begins the closed-loop feedback cycle:
- **Sense**: Gather signals from all sources (Sentry, PostHog, Vercel, local)
- **Analyze**: Detect patterns and anomalies
- **Plan**: Create tasks based on analysis
- **Build**: Execute tasks with confidence gating
- **Verify**: Run tests and benchmarks
- **Deploy**: Deploy verified changes (to staging by default)
- **Monitor**: Watch deployment health
- **Learn**: Extract insights from execution
- **Evolve**: Improve configuration based on learnings

### `stop`
Stop the autonomous orchestrator gracefully.

### `status`
Display current orchestrator status including:
- Current phase
- Number of iterations completed
- Autonomous execution rate
- Success rate
- Recent activity

### `benchmark [suite]`
Run benchmark suite. Available suites:
- `full` - All benchmarks (feature, bugfix, refactor)
- `quick` - Fast benchmarks for CI/CD
- `feature` - Feature implementation benchmarks only
- `bugfix` - Bug fix benchmarks only
- `refactor` - Refactoring benchmarks only

### `learn`
Trigger learning extraction to analyze recent executions and identify:
- Patterns (successful approaches)
- Anti-patterns (recurring problems)
- Optimizations (efficiency improvements)
- Failure modes (common failure causes)
- Success factors (what leads to success)

### `evolve`
Propose and optionally apply configuration improvements based on learnings:
- Confidence threshold adjustments
- Signal weight modifications
- Trigger condition refinements
- Benchmark threshold updates

## Examples

```bash
# Start the orchestrator
/autonomous start

# Check status
/autonomous status

# Run quick benchmarks
/autonomous benchmark quick

# Extract learnings from last 7 days
/autonomous learn

# Propose configuration evolution
/autonomous evolve
```

## Configuration

The orchestrator can be configured in `.claude/settings.json`:

```json
{
  "autonomous": {
    "senseInterval": 60000,
    "buildConcurrency": 3,
    "autoDeployThreshold": 95,
    "autoDeployEnvironment": "staging",
    "enableAutoEvolution": false,
    "monitoringDuration": 300000,
    "dryRun": false
  }
}
```

## Confidence Thresholds

Decisions are made based on confidence scores:
- **>95%**: Auto-execute (proceed autonomously)
- **80-95%**: Notify (proceed with notification)
- **60-80%**: Require Approval (wait for human)
- **<60%**: Escalate (human must intervene)

## Success Metrics

Target metrics for the autonomous system:
- Autonomous execution rate: 70%+
- False positive escalations: <5%
- Mean time to detection: <5 min
- Config evolution frequency: Weekly
