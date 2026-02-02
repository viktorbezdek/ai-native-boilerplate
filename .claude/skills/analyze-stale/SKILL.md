---
name: analyze-stale
description: Detects stale issues, tasks, and conversations
version: 1.0.0
trigger:
  - pattern: "find stale"
  - pattern: "stale analysis"
  - pattern: "what's stuck"
tags:
  - analysis
  - stale-detection
mcp_server: filesystem
---

# Analyze Stale Skill

Identifies stale items across all tracked entities.

@import ../graph-update/SKILL.md

## Thresholds (Configurable)

```yaml
stale_thresholds:
  jira_issue:
    no_update_days: 7
    blocked_days: 3
    in_progress_days: 14
  asana_task:
    no_update_days: 7
    overdue_days: 1
  message:
    no_reply_hours: 24
    thread_stale_days: 3
  calendar:
    no_notes_days: 2  # Meeting happened but no notes
```

## Detection Logic

### Jira Issues

```python
stale_issues = []
for issue in graph.jira:
    days_since_update = now - issue.updated

    if issue.status == "Blocked" and days_since_update > 3:
        stale_issues.append({...severity: "high"})
    elif issue.status == "In Progress" and days_since_update > 14:
        stale_issues.append({...severity: "medium"})
    elif days_since_update > 7:
        stale_issues.append({...severity: "low"})
```

### Asana Tasks

```python
for task in graph.asana:
    if not task.completed:
        if task.due_on and task.due_on < today:
            # Overdue
        elif days_since_modified > 7:
            # Stale
```

### Messages

```python
for thread in graph.chat.threads:
    if thread.needs_my_reply and hours_since_last > 24:
        # Pending reply
```

## Output Format

```json
{
  "analysis": "stale",
  "timestamp": "2024-01-15T10:00:00Z",
  "results": [
    {
      "type": "jira_issue",
      "id": "ENG-123",
      "reason": "Blocked for 5 days",
      "severity": "high",
      "last_update": "2024-01-10T10:00:00Z",
      "suggested_action": "Check with assignee or unblock"
    }
  ],
  "summary": {
    "total_stale": 12,
    "by_severity": {"high": 3, "medium": 5, "low": 4},
    "by_type": {"jira": 6, "asana": 4, "chat": 2}
  }
}
```

## User Interaction

If threshold unclear, ask via AskUserQuestion:
- "What's your definition of stale for Jira issues? (default: 7 days)"
- "How long before a message needs a reply? (default: 24 hours)"

## Memory Integration

Store results for trending:
```
@mcp memory set analysis:stale:{date} <results>
```
