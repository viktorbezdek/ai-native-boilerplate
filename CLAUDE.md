# Personal Work Intelligence System

## Overview

An autonomous personal work intelligence system that:
- Ingests data from multiple sources (Google Chat, Calendar, Drive, Jira, Asana)
- Maintains a local knowledge graph in `./graph/`
- Performs deep analysis (stale incidents, misalignments, reply suggestions)
- Sends interactive macOS notifications with action buttons
- Supports `/full-process` (full rebuild) and `/update` (delta) commands

## Skills

@import .claude/skills/tdd-cycle/SKILL.md

## Data Sources

| Source | Type | Purpose |
|--------|------|---------|
| Google Chat | Messages | Communication tracking |
| Google Calendar | Events | Meeting context |
| Google Drive | Transcripts | Meeting notes & decisions |
| Jira | Issues | Work tracking |
| Asana | Tasks | Project management |

## Critical Rules

### MUST Follow
1. **TDD Always**: Use RED-GREEN-REFACTOR for all implementation
2. **Ask on Ambiguity**: If confidence < 50%, ask user for clarification
3. **No Credentials in Code**: Never commit secrets; use env vars or interactive prompts
4. **Log Everything**: All operations logged to `./logs/`
5. **Phased Approach**: Complete one phase fully before starting next

### NEVER Do
1. Never skip the RED phase (failing test first)
2. Never commit `.env` or credential files
3. Never proceed with ambiguous requirements without asking
4. Never modify protected files without explicit permission

## Interactivity Guidelines

### When to Ask User

Trigger interactive prompts when:
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
│   ├── skills/          # Modular capabilities
│   ├── settings.json    # Hooks and configuration
│   └── hooks/           # Pre/post tool hooks
├── graph/               # Knowledge graph (JSON + markdown)
├── logs/                # Operation logs
├── tests/               # TDD test suites
└── scripts/             # Automation scripts
```

## Environment Variables

Required (will prompt interactively if missing):
- `GOOGLE_CREDENTIALS_PATH` - Path to Google OAuth credentials
- `JIRA_API_TOKEN` - Jira API token
- `ASANA_ACCESS_TOKEN` - Asana personal access token

## Commands

- `/full-process` - Complete rebuild of knowledge graph + full analysis
- `/update` - Delta update, process only new/changed items
- `/tdd-cycle` - Invoke TDD methodology skill
