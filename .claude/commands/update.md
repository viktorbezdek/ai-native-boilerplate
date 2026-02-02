# /update Command

Delta update - processes only new/changed items since last sync.

## Workflow

```
Phase 1: Check Cursors
└── Read sync cursors from @mcp memory

Phase 2: Incremental Fetch (Parallel)
├── @skill fetch-google-chat --since cursor
├── @skill fetch-calendar --since cursor
├── @skill fetch-jira --since cursor
├── @skill fetch-asana --since cursor
└── @skill fetch-sheets --since cursor

Phase 3: Update Graph
└── @skill graph-update (delta only)

Phase 4: Quick Analysis
├── @skill analyze-stale (new items only)
└── @skill suggest-reply (pending only)

Phase 5: Notify (if needed)
└── @skill notify (critical only)
```

## Delta Detection

### Sync Cursors

Stored in shared memory:

```
@mcp memory get sync:cursor:google-chat  → "2024-01-15T10:00:00Z"
@mcp memory get sync:cursor:jira         → "2024-01-15T10:00:00Z"
```

### Incremental Fetch

```yaml
parallel:
  - agent: fetch-worker
    skill: fetch-google-chat
    params:
      since: ${cursor.google_chat}
      limit: 100
  - agent: fetch-worker
    skill: fetch-jira
    params:
      jql: "updated >= '${cursor.jira}'"
```

## Async Continuation

If previous session exists, continue:

```bash
claude --continue <session_id> -p "Continue update from last checkpoint"
```

## Output

```json
{
  "command": "update",
  "type": "delta",
  "started_at": "2024-01-15T07:00:00Z",
  "completed_at": "2024-01-15T07:01:30Z",
  "delta": {
    "new_messages": 15,
    "new_events": 2,
    "updated_issues": 8,
    "new_tasks": 3
  },
  "analysis": {
    "new_stale": 2,
    "pending_replies": 1
  },
  "cursors_updated": true
}
```

## Efficiency

- Skip unchanged sources (no new data)
- Use pagination for large deltas
- Timeout: 2 minutes max
- If delta too large, switch to full-process

## Concurrent Execution

For background/cron:
```bash
claude -p @scripts/update_prompt.txt --output-format json > ./logs/update_$(date +%Y%m%d_%H%M).json
```
