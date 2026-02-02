---
name: fetch-jira
description: Fetches issues and projects from Jira
version: 1.0.0
trigger:
  - pattern: "fetch jira"
  - pattern: "get issues"
  - pattern: "jira tickets"
tags:
  - fetch
  - jira
  - work-tracking
mcp_server: jira
---

# Fetch Jira Skill

Retrieves Jira issues for work tracking in knowledge graph.

## Usage

```
/fetch-jira [project_key] [--status STATUS] [--assignee USER] [--jql "QUERY"]
```

## MCP Integration

Uses `jira` MCP server to query Jira REST API.

### Available Operations

1. **List Projects** - Get accessible projects
2. **Search Issues** - JQL-based issue search
3. **Get Issue Details** - Full issue with comments, history
4. **Get Sprint** - Current sprint issues

## Ambiguity Handling

### Multiple Projects Match

If project name is ambiguous:

```json
{
  "ambiguity_detected": true,
  "options": [
    {"key": "ENG", "name": "Engineering"},
    {"key": "ENGOPS", "name": "Engineering Ops"}
  ],
  "question": "Multiple projects match. Which one?"
}
```

### JQL Syntax Help

If JQL query fails, offer suggestions:
- "Did you mean `status = 'In Progress'`?"
- "Available statuses: To Do, In Progress, Done, Blocked"

### Missing Credentials

Check required env vars:
- `JIRA_HOST` - Atlassian domain
- `JIRA_EMAIL` - User email
- `JIRA_API_TOKEN` - API token

## Output Format

Issues stored in `./graph/jira/` as JSON:

```json
{
  "key": "ENG-123",
  "summary": "Fix login bug",
  "status": "In Progress",
  "assignee": "alice@example.com",
  "reporter": "bob@example.com",
  "priority": "High",
  "created": "2024-01-10T10:00:00Z",
  "updated": "2024-01-15T14:30:00Z",
  "labels": ["bug", "auth"],
  "sprint": "Sprint 42",
  "story_points": 3,
  "comments_count": 5
}
```

## Stale Detection

Issues flagged as potentially stale:
- Status unchanged > 7 days
- No comments > 14 days
- Blocked status > 3 days
