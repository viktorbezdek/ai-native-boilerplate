# Personal Work Intelligence System

## Overview

An autonomous personal work intelligence system that:
- Ingests data from 8 sources (Google Chat, Calendar, Drive, Jira, Asana, Sheets, Slack, Email)
- Maintains a persistent knowledge graph (SQLite + NetworkX) in `./graph/`
- Performs deep analysis using 20 specialized skills with probabilistic scoring
- Sends cross-platform notifications (macOS, Linux, fallback)
- Runs via `/full-process` (full rebuild) and `/update` (delta) commands
- Includes Python runtime executor for skill orchestration
- Provides observability via health checks and metrics collection

## Skills

### Core Methodology
@import .claude/skills/tdd-cycle/SKILL.md

### Data Fetch Skills
@import .claude/skills/fetch-google-chat/SKILL.md
@import .claude/skills/fetch-calendar/SKILL.md
@import .claude/skills/fetch-jira/SKILL.md
@import .claude/skills/fetch-asana/SKILL.md
@import .claude/skills/fetch-sheets/SKILL.md
@import .claude/skills/fetch-slack/SKILL.md
@import .claude/skills/fetch-email/SKILL.md

### Core Issue Detection (Skills 1-3)
@import .claude/skills/stale-detection/SKILL.md
@import .claude/skills/misalignment-check/SKILL.md
@import .claude/skills/reply-suggestion/SKILL.md

### Sentiment & Morale (Skills 4-5)
@import .claude/skills/sentiment-analysis/SKILL.md
@import .claude/skills/morale-forecasting/SKILL.md

### Relationship & Insight Mining (Skills 6-8)
@import .claude/skills/blocker-identification/SKILL.md
@import .claude/skills/action-item-extraction/SKILL.md
@import .claude/skills/trend-detection/SKILL.md

### KG Query & Retrieval (Skills 9-10)
@import .claude/skills/context-query/SKILL.md
@import .claude/skills/entity-reconciliation/SKILL.md

### KG Enrichment & Inference (Skills 11-13)
@import .claude/skills/inference-engine/SKILL.md
@import .claude/skills/knowledge-gap-filler/SKILL.md
@import .claude/skills/semantic-enrichment/SKILL.md

### KG Simulation & Forecasting (Skills 14-15)
@import .claude/skills/ripple-effect-simulation/SKILL.md
@import .claude/skills/what-if-analysis/SKILL.md

### Visualization & Reporting (Skill 16)
@import .claude/skills/graph-visualization/SKILL.md

### Expansion Skills (Skills 17-20)
@import .claude/skills/expertise-mapping/SKILL.md
@import .claude/skills/echo-chamber-detection/SKILL.md
@import .claude/skills/innovation-opportunity-spotting/SKILL.md
@import .claude/skills/self-improvement-loop/SKILL.md

### Graph Management
@import .claude/skills/graph-update/SKILL.md

### Notification
@import .claude/skills/notify/SKILL.md

## Data Sources

| Source | Type | Fetch Skill | Purpose |
|--------|------|-------------|---------|
| Google Chat | Messages | fetch-google-chat | Communication tracking |
| Google Calendar | Events | fetch-calendar | Meeting context |
| Google Drive | Transcripts | fetch-google-chat | Meeting notes & decisions |
| Jira | Issues | fetch-jira | Work tracking |
| Asana | Tasks | fetch-asana | Project management |
| Google Sheets | Metrics | fetch-sheets | Business performance data |
| Slack | Messages | fetch-slack | Communication tracking |
| Email (IMAP) | Messages | fetch-email | Email communication |

## Python Runtime

### Skill Executor

```python
from pwi.skills import SkillExecutor, SkillRegistry
from pwi.graph import GraphStore

store = GraphStore("./graph/pwi.db")
registry = SkillRegistry(".claude/skills")
executor = SkillExecutor(store, registry)

# Single skill
result = await executor.execute("stale-detection", context)

# Parallel batch
results = await executor.execute_parallel(
    ["stale-detection", "misalignment-check", "reply-suggestion"],
    context
)

# Full pipeline
results = await executor.execute_pipeline([
    {"parallel": ["fetch-google-chat", "fetch-jira", "fetch-asana"]},
    {"sequential": ["entity-reconciliation"]},
    {"parallel": ["stale-detection", "misalignment-check", "reply-suggestion"]},
    {"parallel": ["sentiment-analysis", "morale-forecasting"]},
    {"sequential": ["self-improvement-loop"]}
], context)
```

### Graph Persistence

```python
from pwi.graph import GraphStore, SchemaValidator

store = GraphStore("./graph/pwi.db")
validator = SchemaValidator("./graph/schema.json")

# Validate and store
valid, errors = validator.validate_node("message", data)
if valid:
    store.upsert_node(node_id, "message", data)

# Query
G = store.to_networkx()  # Export to NetworkX for analysis
stats = store.get_stats()  # Node/edge counts, type distribution
```

### Observability

```python
from pwi.observability import HealthCheck, MetricsCollector

health = HealthCheck(".")
report = health.check_all()
# {"overall_status": "ok", "skills": {...}, "graph": {...}, "mcp": {...}, ...}

metrics = MetricsCollector("./logs")
report = metrics.generate_report()
# {"skill_metrics": {...}, "pipeline_metrics": {...}, "graph_growth": {...}}
```

## Agents

| Agent | File | Role |
|-------|------|------|
| Observer | `.claude/agents/observer.md` | Orchestrates sub-agents, monitors data sources |
| Deep Analyst | `.claude/agents/deep-analyst.md` | Runs all 20 analysis skills in parallel/sequential groups |
| Fetch Worker | `.claude/agents/fetch-worker.md` | Parallel data fetching with pagination and retries |
| Reply Suggester | `.claude/agents/reply-suggester.md` | Drafts reply suggestions with tone matching |
| Human-in-Loop | `.claude/agents/human-in-loop.md` | Interactive clarification for low-confidence decisions |
| Personality Analyzer | `.claude/agents/personality-analyzer.md` | Builds communication style profiles per person |

## Critical Rules

### MUST Follow
1. **TDD Always**: Use RED-GREEN-REFACTOR for all implementation
2. **Ask on Ambiguity**: If confidence < 0.5, ask user for clarification
3. **Probabilistic Output**: All skills output confidence scores
4. **No Credentials in Code**: Never commit secrets; use env vars or interactive prompts
5. **Log Everything**: All operations logged to `./logs/`
6. **Phased Approach**: Complete one phase fully before starting next
7. **Validate Environment**: Run `scripts/validate_env.sh` before first use

### NEVER Do
1. Never skip the RED phase (failing test first)
2. Never commit `.env` or credential files
3. Never proceed with ambiguous requirements without asking
4. Never modify protected files without explicit permission
5. Never auto-execute when confidence < 0.5
6. Never store credentials in plain text outside env vars

## Interactivity Guidelines

### When to Ask User

Trigger interactive prompts when:
- **Low confidence** (any skill output with confidence < 0.5)
- **Ambiguity detected** (multiple valid interpretations)
- **Missing information** (tokens, paths, thresholds)
- **High-impact decisions** (destructive operations, config changes)
- **Threshold choices** (what counts as "stale"? how many days?)

### How to Ask

1. **Simple y/n**: For binary choices, output to stdout
2. **Numbered choices**: For multiple options, list with numbers
3. **AskUserQuestion tool**: For complex decisions needing context
4. **Notification**: For high-importance items requiring attention

### Ambiguity Response Format

```json
{
  "ambiguity_detected": true,
  "confidence": 0.4,
  "options": [...],
  "question": "Which approach?"
}
```

## Skill Orchestration

### Confidence Thresholds

| Threshold | Action |
|-----------|--------|
| >= 0.8 | Auto-execute, log result |
| 0.5-0.8 | Execute with notification |
| < 0.5 | Pause, ask user |

### Parallel Skill Groups

```yaml
parallel_groups:
  fetch: [fetch-google-chat, fetch-calendar, fetch-jira, fetch-asana, fetch-sheets, fetch-slack, fetch-email]
  core_analysis: [stale-detection, misalignment-check, reply-suggestion]
  sentiment: [sentiment-analysis, morale-forecasting]
  mining: [blocker-identification, action-item-extraction, trend-detection]
  enrichment: [inference-engine, knowledge-gap-filler, semantic-enrichment]
  expansion: [expertise-mapping, echo-chamber-detection, innovation-opportunity-spotting]

sequential:
  - entity-reconciliation  # Must run after fetch
  - ripple-effect-simulation  # Requires enriched KG
  - what-if-analysis  # Requires completed graph
  - graph-visualization  # Runs after all analysis
  - self-improvement-loop  # Runs last, meta-analysis
```

## TDD Workflow

All development follows strict RED-GREEN-REFACTOR:

1. **RED**: Write failing test first
2. **GREEN**: Minimal code to pass
3. **REFACTOR**: Clean up with tests as safety net

See @skill tdd-cycle for detailed methodology.

## Directory Structure

```
./
├── .claude/
│   ├── skills/           # 30 modular capabilities
│   │   ├── tdd-cycle/    # Core methodology
│   │   ├── fetch-*/      # 7 data fetch skills
│   │   ├── stale-detection/  ... # 20 analysis skills
│   │   ├── graph-update/ # Graph management
│   │   └── notify/       # Cross-platform notifications
│   ├── commands/         # /full-process, /update
│   ├── agents/           # 6 agent definitions
│   ├── settings.json     # Hooks, permissions, model config
│   └── hooks/            # Pre/post tool hooks (5 scripts)
├── pwi/                  # Python runtime
│   ├── skills/           # SkillExecutor, SkillRegistry, SkillResult
│   ├── graph/            # GraphStore (SQLite+NetworkX), SchemaValidator
│   └── observability/    # HealthCheck, MetricsCollector
├── graph/                # Knowledge graph storage
│   ├── schema.json       # Graph schema definition
│   ├── pwi.db            # SQLite database (gitignored)
│   ├── nodes/            # Entity nodes by type
│   └── edges/            # Relationship edges
├── data/                 # Runtime fetch data (gitignored)
├── tokens/               # OAuth tokens (gitignored)
├── logs/                 # Operation logs (gitignored)
├── tests/
│   ├── skills/           # Bash structural tests (120 tests)
│   └── python/           # Pytest functional tests (56 tests)
├── scripts/              # Automation scripts
│   ├── full_process.sh   # Weekly full rebuild
│   ├── update.sh         # Daily delta sync
│   ├── setup_cron.sh     # Cron installation
│   └── validate_env.sh   # Environment validation
├── requirements.txt      # Python dependencies
├── package.json          # Node.js/MCP dependencies
└── .env.example          # Environment variable template
```

## Environment Variables

Required (will prompt interactively if missing):
- `GOOGLE_CREDENTIALS_PATH` - Path to Google OAuth credentials
- `JIRA_API_TOKEN` - Jira API token
- `JIRA_HOST` - Jira instance hostname
- `JIRA_EMAIL` - Jira account email
- `ASANA_ACCESS_TOKEN` - Asana personal access token

Optional:
- `GOOGLE_TOKEN_PATH` - Path to Google OAuth token (default: `./tokens/google-token.json`)
- `ASANA_WORKSPACE_GID` - Asana workspace ID
- `METRICS_SPREADSHEET_ID` - Google Sheets spreadsheet ID for metrics
- `SLACK_BOT_TOKEN` - Slack Bot Token (xoxb-...)
- `SLACK_WORKSPACE_ID` - Slack workspace ID
- `IMAP_HOST` - Email IMAP server hostname
- `IMAP_PORT` - IMAP port (default: 993)
- `IMAP_USERNAME` - Email account username
- `IMAP_PASSWORD` - Email account password/app password

## Setup

```bash
# 1. Install dependencies
npm install           # MCP server packages
pip install -r requirements.txt  # Python packages

# 2. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 3. Validate setup
bash scripts/validate_env.sh

# 4. Run health check
python -c "from pwi.observability import HealthCheck; print(HealthCheck('.').check_all())"

# 5. Install cron (optional)
bash scripts/setup_cron.sh
```

## Commands

- `/full-process` - Complete rebuild of knowledge graph + full 20-skill analysis
- `/update` - Delta update, process only new/changed items with quick analysis
- `/tdd-cycle` - Invoke TDD methodology skill

## Testing

```bash
# Structural tests (bash)
bash tests/skills/test-deep-analysis-batch1.sh
bash tests/skills/test-deep-analysis-batch2.sh
bash tests/skills/test-deep-analysis-batch3.sh
bash tests/skills/test-deep-analysis-batch4.sh

# Functional tests (pytest)
pytest tests/python/ -v
```
