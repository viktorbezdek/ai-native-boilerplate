# /update Command

Delta update - processes only new/changed items with focused analysis.

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
├── @skill graph-update (delta only)
└── @skill entity-reconciliation (new entities only)

Phase 4: Quick Enrichment
└── @skill inference-engine (new nodes only)

Phase 5: Core Analysis (Parallel)
├── @skill stale-detection (check decay on existing)
├── @skill reply-suggestion (pending only)
└── @skill blocker-identification (new blockers)

Phase 6: Sentiment Check
└── @skill sentiment-analysis (new messages only)

Phase 7: Action Extraction
└── @skill action-item-extraction (new items)

Phase 8: Notify (if needed)
└── @skill notify (critical only, confidence ≥ 0.7)
```

## Delta Detection

### Sync Cursors

Stored in shared memory:

```
@mcp memory get sync:cursor:google-chat  → "2024-01-15T10:00:00Z"
@mcp memory get sync:cursor:jira         → "2024-01-15T10:00:00Z"
@mcp memory get sync:cursor:calendar     → "2024-01-15T10:00:00Z"
@mcp memory get sync:cursor:asana        → "2024-01-15T10:00:00Z"
@mcp memory get sync:cursor:sheets       → "2024-01-15T10:00:00Z"
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
  - agent: fetch-worker
    skill: fetch-calendar
    params:
      timeMin: ${cursor.calendar}
  - agent: fetch-worker
    skill: fetch-asana
    params:
      modified_since: ${cursor.asana}
```

## Analysis Configuration

### Skills Used in Delta Mode

| Skill | Mode | Scope |
|-------|------|-------|
| stale-detection | check_existing | Items approaching threshold |
| reply-suggestion | pending_only | Unanswered messages |
| blocker-identification | new_only | Newly created blockers |
| sentiment-analysis | new_messages | Fresh communications |
| action-item-extraction | new_items | Recently added content |
| inference-engine | new_nodes | Connect new entities |

### Confidence Handling

```yaml
confidence_actions:
  high (≥0.8): auto_apply
  medium (0.5-0.8): apply_with_log
  low (<0.5): skip_and_flag
```

## Execution Steps

### Step 1: Load Cursors

```python
cursors = {
    source: mcp_memory_get(f"sync:cursor:{source}")
    for source in ["google-chat", "calendar", "jira", "asana", "sheets"]
}
```

### Step 2: Parallel Incremental Fetch

```yaml
parallel:
  - skill: fetch-google-chat
    since: ${cursors.google-chat}
  - skill: fetch-calendar
    since: ${cursors.calendar}
  - skill: fetch-jira
    since: ${cursors.jira}
  - skill: fetch-asana
    since: ${cursors.asana}
  - skill: fetch-sheets
    since: ${cursors.sheets}
```

### Step 3: Delta Graph Update

```yaml
sequential:
  - skill: graph-update
    mode: delta
    input: new_items_only
  - skill: entity-reconciliation
    scope: new_entities
    auto_merge_threshold: 0.85
```

### Step 4: Quick Analysis

```yaml
parallel:
  - skill: stale-detection
    mode: check_decay
    threshold_days: 7
  - skill: reply-suggestion
    filter: pending
  - skill: blocker-identification
    scope: new_blockers
```

### Step 5: Sentiment on New Content

```yaml
sequential:
  - skill: sentiment-analysis
    scope: new_messages
    alert_threshold: -0.5
```

### Step 6: Extract Actions

```yaml
sequential:
  - skill: action-item-extraction
    scope: new_items
    auto_assign: true
    confidence_min: 0.6
```

### Step 7: Notify

```yaml
sequential:
  - skill: notify
    conditions:
      - severity == "critical"
      - confidence >= 0.7
    max_notifications: 3
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
    "new_tasks": 3,
    "total_new_items": 28
  },
  "graph_updates": {
    "nodes_added": 28,
    "edges_inferred": 12,
    "duplicates_merged": 1
  },
  "analysis": {
    "stale_approaching": 2,
    "pending_replies": 1,
    "new_blockers": 1,
    "negative_sentiment_flags": 0,
    "action_items_extracted": 5
  },
  "notifications_sent": 1,
  "cursors_updated": true,
  "low_confidence_skipped": 2
}
```

## Efficiency

- Skip unchanged sources (no new data since cursor)
- Use pagination for large deltas
- Timeout: 2 minutes max
- If delta > 500 items, recommend switching to full-process

## Concurrent Execution

For background/cron:
```bash
./scripts/update.sh
```

Or directly:
```bash
claude -p @scripts/update_prompt.txt --output-format json > ./logs/update_$(date +%Y%m%d_%H%M).json
```

## Fallback to Full Process

```python
if delta_count > 500:
    response = ask_user({
        "question": f"Delta has {delta_count} items. Switch to full-process?",
        "options": ["Yes, run full-process", "No, continue with delta"],
        "recommendation": "full-process for large deltas"
    })
```
