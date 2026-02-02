---
name: analyze-misalignment
description: Detects misalignments between systems and expectations
version: 1.0.0
trigger:
  - pattern: "find misalignment"
  - pattern: "sync issues"
  - pattern: "what's out of sync"
tags:
  - analysis
  - alignment
mcp_server: filesystem
---

# Analyze Misalignment Skill

Identifies discrepancies between tracked systems.

@import ../graph-update/SKILL.md

## Misalignment Types

### 1. Calendar-Task Mismatch

Meeting scheduled but no related task/issue:
```python
for event in graph.calendar:
    if event.is_meeting and not find_related_tasks(event):
        misalignments.append({
            "type": "meeting_no_task",
            "event": event,
            "suggestion": "Create task for meeting outcomes"
        })
```

### 2. Assignee Discrepancy

Different assignee in Jira vs Asana for same work:
```python
for issue in graph.jira:
    related_tasks = find_related_asana(issue)
    for task in related_tasks:
        if task.assignee != issue.assignee:
            misalignments.append({
                "type": "assignee_mismatch",
                "jira": issue.key,
                "asana": task.gid,
                "jira_assignee": issue.assignee,
                "asana_assignee": task.assignee
            })
```

### 3. Status Discrepancy

Task done in one system but not other:
```python
# Asana complete but Jira still open
if task.completed and issue.status not in ["Done", "Closed"]:
    misalignments.append(...)
```

### 4. Due Date Conflicts

Different due dates across systems:
```python
if abs(task.due_on - issue.due_date) > timedelta(days=1):
    misalignments.append({
        "type": "due_date_mismatch",
        "difference_days": diff
    })
```

### 5. Missing Cross-References

Issue mentioned in chat but no link:
```python
for message in graph.chat:
    mentioned_issues = extract_issue_keys(message.text)
    for key in mentioned_issues:
        issue = graph.jira.get(key)
        if issue and message.id not in issue.links:
            misalignments.append({
                "type": "missing_link",
                "message": message.id,
                "issue": key
            })
```

## Threshold Configuration

```yaml
misalignment_config:
  due_date_tolerance_days: 1
  consider_related_if_same_title: true
  min_title_similarity: 0.7
```

## Output Format

```json
{
  "analysis": "misalignment",
  "timestamp": "2024-01-15T10:00:00Z",
  "results": [
    {
      "type": "assignee_mismatch",
      "severity": "medium",
      "entities": ["ENG-123", "asana:456"],
      "details": {
        "jira_assignee": "alice@example.com",
        "asana_assignee": "bob@example.com"
      },
      "suggested_action": "Align assignees across systems"
    }
  ],
  "summary": {
    "total_misalignments": 8,
    "by_type": {
      "assignee_mismatch": 2,
      "status_discrepancy": 3,
      "missing_link": 3
    }
  }
}
```

## Resolution Actions

Suggest fixes for each misalignment type:
- **assignee_mismatch**: "Update Asana assignee to match Jira?"
- **status_discrepancy**: "Close Jira issue ENG-123?"
- **missing_link**: "Add chat reference to issue?"

Spawn `human-in-loop` for confirmation if needed.
