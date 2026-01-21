---
name: observability
description: AI development observability dashboard - view sessions, metrics, drift, quality, and performance analytics
allowed-tools:
  - Read
  - Bash
  - Grep
---

# Observability Dashboard Skill

Provides full visibility into Claude Code execution: sessions, agents, tasks, skills, drift detection, quality metrics, and performance analytics.

## When to Use

Use this skill when the user asks about:
- Session history or metrics
- Tool usage statistics
- Execution performance
- Quality trends (tests, lint, builds)
- Drift detection / scope creep
- Task completion rates
- Cost or resource usage analysis

## Log Files

All telemetry is stored in `.claude/logs/`:

| File | Contents |
|------|----------|
| `sessions.jsonl` | Comprehensive session summaries |
| `telemetry.jsonl` | Tool invocation events |
| `executions.jsonl` | Timing and success/failure data |
| `quality.jsonl` | Test, lint, build results |
| `drift.jsonl` | Scope creep and unplanned changes |
| `metrics.json` | Real-time session metrics |

## Analysis Commands

### Recent Sessions Summary
```bash
tail -5 .claude/logs/sessions.jsonl | jq '.'
```

### Tool Usage Distribution
```bash
tail -1 .claude/logs/sessions.jsonl | jq '.tool_usage'
```

### Quality Trends (Last 10 Test Runs)
```bash
grep '"type":"test"' .claude/logs/quality.jsonl | tail -10 | jq '.metrics'
```

### Drift Events
```bash
cat .claude/logs/drift.jsonl | jq 'select(.severity != "low")'
```

### Average Operation Duration
```bash
tail -100 .claude/logs/executions.jsonl | jq -s 'map(.duration_ms) | add / length'
```

### Success Rate
```bash
tail -100 .claude/logs/executions.jsonl | jq -s '(map(select(.success)) | length) / length * 100'
```

### Files Most Frequently Modified
```bash
jq -r '.file_path // empty' .claude/logs/telemetry.jsonl | sort | uniq -c | sort -rn | head -10
```

### Agents Spawned
```bash
jq 'select(.category == "agent")' .claude/logs/telemetry.jsonl | jq -s 'length'
```

### Skills Used
```bash
jq 'select(.category == "skill") | .skill' .claude/logs/telemetry.jsonl | sort | uniq -c
```

## Output Format

When reporting metrics, use this format:

```markdown
## Observability Report

### Session Overview
| Metric | Value |
|--------|-------|
| Total Sessions | X |
| Avg Duration | Xm |
| Total Operations | X |
| Success Rate | X% |

### Tool Usage (Last Session)
| Tool | Count |
|------|-------|
| Read | X |
| Edit | X |
| Bash | X |

### Quality Metrics
| Metric | Value | Trend |
|--------|-------|-------|
| Tests Passed | X | ↑/↓/→ |
| Tests Failed | X | ↑/↓/→ |
| Lint Errors | X | ↑/↓/→ |
| Build Success | X% | ↑/↓/→ |

### Drift Analysis
| Type | Count | Severity |
|------|-------|----------|
| Scope Additions | X | low/med/high |
| Unplanned Files | X | low/med/high |

### Task Completion
- Planned: X tasks
- Completed: X tasks
- Completion Rate: X%

### Recommendations
1. [Based on metrics analysis]
```

## Key Metrics to Track

### Performance
- **Avg Operation Duration**: < 500ms is good
- **Success Rate**: > 95% is healthy
- **Session Duration**: Track for capacity planning

### Quality
- **Test Pass Rate**: Target 100%
- **Lint Errors**: Target 0
- **Build Success**: Target 100%

### Execution
- **Task Completion Rate**: Target > 90%
- **Drift Score**: Low scope creep is ideal
- **Agent Efficiency**: Fewer agents = more focused work

### Patterns to Watch
- Increasing error rates
- Growing drift/scope creep
- Declining test coverage
- Repeated failures on same operations

## Alerts and Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Success Rate | < 90% | < 80% |
| Test Failures | > 5 | > 10 |
| Drift Score | > 3 additions | > 5 additions |
| Lint Errors | > 10 | > 25 |
| Avg Duration | > 1000ms | > 2000ms |

## Integration with Optimizer Agent

The optimizer agent can read these logs to:
1. Identify inefficient patterns
2. Suggest configuration improvements
3. Detect recurring issues
4. Optimize agent selection
5. Improve skill recommendations
