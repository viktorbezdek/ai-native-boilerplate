---
name: fetch-asana
description: Fetches tasks and projects from Asana
version: 1.0.0
trigger:
  - pattern: "fetch asana"
  - pattern: "get tasks"
  - pattern: "asana projects"
tags:
  - fetch
  - asana
  - project-management
mcp_server: asana
---

# Fetch Asana Skill

Retrieves Asana tasks for project management in knowledge graph.

## Usage

```
/fetch-asana [project_name] [--workspace WORKSPACE] [--assignee USER] [--due DATE]
```

## MCP Integration

Uses `asana` MCP server to query Asana API.

### Available Operations

1. **List Workspaces** - Get accessible workspaces
2. **List Projects** - Projects in a workspace
3. **Get Tasks** - Tasks from project or search
4. **Get Task Details** - Full task with subtasks, comments

## Ambiguity Handling

### Multiple Workspaces

If user belongs to multiple workspaces:

```json
{
  "ambiguity_detected": true,
  "options": [
    {"id": "111", "name": "Personal Workspace"},
    {"id": "222", "name": "Company Workspace"}
  ],
  "question": "Which workspace? (or 'all')"
}
```

### Project Name Ambiguous

If multiple projects match search:
- List matching projects with task counts
- Ask user to select or refine search

### Missing Token

If `ASANA_ACCESS_TOKEN` not set:
1. Prompt: "Asana access token required"
2. Link: https://app.asana.com/0/developer-console
3. Guide through token creation

## Output Format

Tasks stored in `./graph/asana/` as JSON:

```json
{
  "gid": "1234567890",
  "name": "Design review",
  "completed": false,
  "assignee": "alice@example.com",
  "due_on": "2024-01-20",
  "projects": ["Product Launch"],
  "tags": ["design", "review"],
  "created_at": "2024-01-10T10:00:00Z",
  "modified_at": "2024-01-15T14:30:00Z",
  "notes": "Review the new dashboard design",
  "subtasks_count": 3,
  "comments_count": 2
}
```

## Cross-Reference

Link Asana tasks to:
- Jira issues (by name/description matching)
- Calendar events (by due date)
- Chat mentions (by task URL)
