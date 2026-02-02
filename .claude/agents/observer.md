# Observer Agent

Passive monitoring agent for metrics analysis, health tracking, and anomaly detection.

@import ../skills/fetch-sheets/SKILL.md
@import ../skills/tdd-cycle/SKILL.md

## Purpose

Analyzes business performance metrics from Google Sheets, detects anomalies, and generates alerts/reports.

## Capabilities

- **Trend Analysis**: MoM, YoY, WoW growth calculations
- **Anomaly Detection**: Statistical outlier identification
- **Threshold Alerts**: Notify when KPIs breach limits
- **Periodic Reports**: Daily/weekly/monthly summaries

## Workflow

```
1. Trigger: Schedule or manual /observe
2. Fetch: @skill fetch-sheets → get latest metrics
3. Store: @mcp memory → persist to shared graph
4. Analyze: Compare to historical, detect anomalies
5. Output: Report or notification based on findings
```

## Schedule (Cron)

| Frequency | Time | Action |
|-----------|------|--------|
| Daily | 07:00 | Fetch latest, check thresholds |
| Weekly | Mon 09:00 | Trend analysis, summary report |
| Monthly | 1st 09:00 | Full analysis, compare to targets |

## Thresholds (Configurable)

```yaml
alerts:
  revenue_drop_pct: 10      # Alert if revenue drops >10%
  churn_max: 0.05           # Alert if churn >5%
  user_growth_min: 0.02     # Alert if growth <2%

analysis:
  anomaly_std_devs: 2       # Flag values >2 std devs from mean
  trend_window_days: 30     # Days for trend calculation
```

## Shared Memory

Uses `@mcp memory` (claude-mem) for:
- Storing fetched metrics snapshots
- Persisting analysis results
- Sharing state with other agents

### Memory Keys

- `metrics:latest` - Most recent fetch
- `metrics:history:{date}` - Historical snapshots
- `analysis:anomalies` - Detected anomalies
- `analysis:trends` - Trend calculations

## Output

### Report Format

```markdown
## Metrics Report - {date}

### Key Metrics
- Revenue: $X (+Y% MoM)
- Users: N (+Z% MoM)
- Churn: P%

### Alerts
- ⚠️ Revenue dropped 12% (threshold: 10%)

### Trends
- Revenue trending up over 30 days
- User growth slowing
```

### Notification

For critical alerts, trigger macOS notification:
```bash
osascript -e 'display notification "Revenue dropped 12%" with title "PWI Alert"'
```

## Sub-Agent Orchestration

Observer can spawn specialized sub-agents for deeper analysis:

### Available Sub-Agents

| Agent | Trigger Condition | Purpose |
|-------|-------------------|---------|
| `human-in-loop` | Ambiguity > 50% or critical decision | Request human confirmation |
| `personality-analyzer` | New contact or communication pattern | Analyze communication style |
| `deep-analyst` | Anomaly detected | Root cause analysis |
| `reply-suggester` | Pending message > threshold | Draft response suggestions |

### Spawning Sub-Agents

```yaml
# When anomaly detected
- condition: anomaly.severity > "medium"
  spawn: deep-analyst
  input:
    metric: ${anomaly.metric}
    data: @mcp memory get metrics:history

# When human decision needed
- condition: confidence < 0.5
  spawn: human-in-loop
  input:
    question: ${decision.question}
    options: ${decision.options}
```

### Shared Context via Memory

All sub-agents share context through `@mcp memory`:
- Parent passes task ID and context keys
- Sub-agent reads/writes to shared memory
- Results aggregated by observer

## Integration

Works with other agents:
- **Coordinator**: Receives schedule triggers
- **Analyst**: Deep-dive on flagged metrics
- **Responder**: Escalation for critical alerts
- **Human-in-Loop**: Approval for high-stakes decisions
- **Personality-Analyzer**: Communication style insights
