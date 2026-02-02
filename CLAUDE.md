# Personal Work Intelligence System

## Overview

An autonomous personal work intelligence system that:
- Ingests data from multiple sources (Google Chat, Calendar, Drive, Jira, Asana)
- Maintains a local knowledge graph in `./graph/`
- Performs deep analysis using 20 specialized skills with probabilistic scoring
- Sends interactive macOS notifications with action buttons
- Supports `/full-process` (full rebuild) and `/update` (delta) commands

## Skills

### Core Methodology
@import .claude/skills/tdd-cycle/SKILL.md

### Data Fetch Skills
@import .claude/skills/fetch-google-chat/SKILL.md
@import .claude/skills/fetch-calendar/SKILL.md
@import .claude/skills/fetch-jira/SKILL.md
@import .claude/skills/fetch-asana/SKILL.md
@import .claude/skills/fetch-sheets/SKILL.md

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

### Notification
@import .claude/skills/notify/SKILL.md

## Data Sources

| Source | Type | Purpose |
|--------|------|---------|
| Google Chat | Messages | Communication tracking |
| Google Calendar | Events | Meeting context |
| Google Drive | Transcripts | Meeting notes & decisions |
| Jira | Issues | Work tracking |
| Asana | Tasks | Project management |
| Google Sheets | Metrics | Business performance data |

## Critical Rules

### MUST Follow
1. **TDD Always**: Use RED-GREEN-REFACTOR for all implementation
2. **Ask on Ambiguity**: If confidence < 0.5, ask user for clarification
3. **Probabilistic Output**: All skills output confidence scores
4. **No Credentials in Code**: Never commit secrets; use env vars or interactive prompts
5. **Log Everything**: All operations logged to `./logs/`
6. **Phased Approach**: Complete one phase fully before starting next

### NEVER Do
1. Never skip the RED phase (failing test first)
2. Never commit `.env` or credential files
3. Never proceed with ambiguous requirements without asking
4. Never modify protected files without explicit permission
5. Never auto-execute when confidence < 0.5

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
4. **macOS notification**: For high-importance items requiring attention

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
| ≥ 0.8 | Auto-execute, log result |
| 0.5-0.8 | Execute with notification |
| < 0.5 | Pause, ask user |

### Parallel Skill Groups

```yaml
# Skills that can run in parallel
parallel_groups:
  fetch: [fetch-google-chat, fetch-calendar, fetch-jira, fetch-asana, fetch-sheets]
  core_analysis: [stale-detection, misalignment-check, reply-suggestion]
  sentiment: [sentiment-analysis, morale-forecasting]
  mining: [blocker-identification, action-item-extraction, trend-detection]
  enrichment: [inference-engine, knowledge-gap-filler, semantic-enrichment]

# Skills that require sequential execution
sequential:
  - entity-reconciliation  # Must run after fetch
  - ripple-effect-simulation  # Requires enriched KG
  - what-if-analysis  # Requires completed graph
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
│   ├── skills/          # 20+ modular capabilities
│   ├── commands/        # /full-process, /update
│   ├── agents/          # Observer, sub-agents
│   ├── settings.json    # Hooks and configuration
│   └── hooks/           # Pre/post tool hooks
├── graph/               # Knowledge graph (JSON + NetworkX)
│   ├── schema.json      # Graph schema definition
│   ├── nodes/           # Entity nodes by type
│   └── edges/           # Relationship edges
├── logs/                # Operation logs
├── tests/               # TDD test suites
│   └── skills/          # Skill-specific tests
└── scripts/             # Automation scripts
    ├── full_process.sh
    ├── update.sh
    └── setup_cron.sh
```

## Environment Variables

Required (will prompt interactively if missing):
- `GOOGLE_CREDENTIALS_PATH` - Path to Google OAuth credentials
- `JIRA_API_TOKEN` - Jira API token
- `ASANA_ACCESS_TOKEN` - Asana personal access token

## Commands

- `/full-process` - Complete rebuild of knowledge graph + full 20-skill analysis
- `/update` - Delta update, process only new/changed items with quick analysis
- `/tdd-cycle` - Invoke TDD methodology skill
