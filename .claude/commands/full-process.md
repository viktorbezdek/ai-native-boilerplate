# /full-process Command

Complete rebuild of knowledge graph and full analysis.

## Workflow

```
Phase 1: Fetch (Parallel)
├── @skill fetch-google-chat
├── @skill fetch-calendar
├── @skill fetch-jira
├── @skill fetch-asana
└── @skill fetch-sheets

Phase 2: Update Graph
└── @skill graph-update (batch all fetched data)

Phase 3: Analyze (Parallel)
├── @skill analyze-stale
├── @skill analyze-misalignment
└── @skill suggest-reply

Phase 4: Report & Notify
├── Generate summary report
└── @skill notify (for critical items)
```

## Execution Steps

### Step 1: Parallel Fetch

Spawn concurrent subagents for each data source:

```yaml
parallel:
  - agent: fetch-worker
    skill: fetch-google-chat
    output: ./data/chat_raw.json
  - agent: fetch-worker
    skill: fetch-calendar
    output: ./data/calendar_raw.json
  - agent: fetch-worker
    skill: fetch-jira
    output: ./data/jira_raw.json
  - agent: fetch-worker
    skill: fetch-asana
    output: ./data/asana_raw.json
  - agent: fetch-worker
    skill: fetch-sheets
    output: ./data/metrics_raw.json
```

### Step 2: Graph Update

Sequential upsert of all fetched data:

```yaml
sequential:
  - skill: graph-update
    input: ./data/*_raw.json
    output: ./graph/
```

### Step 3: Parallel Analysis

```yaml
parallel:
  - agent: analyst
    skill: analyze-stale
    input: @mcp memory get graph:*
  - agent: analyst
    skill: analyze-misalignment
    input: @mcp memory get graph:*
  - agent: analyst
    skill: suggest-reply
    input: @mcp memory get graph:chat:*
```

### Step 4: Notify

For high-priority findings:

```yaml
sequential:
  - skill: notify
    condition: results.severity == "high"
    input: analysis_results
```

## Output

```json
{
  "command": "full-process",
  "started_at": "2024-01-15T03:00:00Z",
  "completed_at": "2024-01-15T03:05:00Z",
  "phases": {
    "fetch": {"status": "complete", "items": 1250},
    "graph_update": {"status": "complete", "upserted": 1250},
    "analysis": {"status": "complete", "findings": 15},
    "notify": {"status": "complete", "sent": 3}
  },
  "summary": {
    "stale_items": 8,
    "misalignments": 4,
    "pending_replies": 3
  }
}
```

## Async Execution

For cron/background:
```bash
claude -p @scripts/full_process_prompt.txt --output-format json > ./logs/full_process_$(date +%Y%m%d).json
```
