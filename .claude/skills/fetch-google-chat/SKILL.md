---
name: fetch-google-chat
description: Fetches messages from Google Chat spaces and DMs
version: 1.0.0
trigger:
  - pattern: "fetch chat"
  - pattern: "get messages"
  - pattern: "google chat"
tags:
  - fetch
  - google
  - communication
mcp_server: google-workspace
---

# Fetch Google Chat Skill

Retrieves messages from Google Chat for knowledge graph ingestion.

## Usage

```
/fetch-google-chat [space_name] [--since DATE] [--limit N]
```

## MCP Integration

Uses `google-workspace` MCP server to query Chat API.

### Available Operations

1. **List Spaces** - Get all accessible Chat spaces
2. **Get Messages** - Fetch messages from a specific space
3. **Search Messages** - Query messages by content/date

## Ambiguity Handling

### Multiple Spaces Found

If query matches multiple spaces, **ask user to clarify**:

```json
{
  "ambiguity_detected": true,
  "options": [
    {"id": 1, "name": "Engineering Team", "type": "SPACE"},
    {"id": 2, "name": "Engineering Alerts", "type": "SPACE"}
  ],
  "question": "Multiple spaces match 'Engineering'. Which one?"
}
```

### Missing Credentials

If Google credentials not configured:
1. Check `GOOGLE_CREDENTIALS_PATH` env var
2. Prompt user: "Google OAuth credentials required. Path to credentials.json?"
3. Guide through OAuth flow if needed

## Output Format

Messages stored in `./graph/chat/` as JSON:

```json
{
  "id": "spaces/xxx/messages/yyy",
  "sender": "user@example.com",
  "text": "Message content",
  "timestamp": "2024-01-15T10:30:00Z",
  "space": "Engineering Team",
  "thread_id": "optional"
}
```

## Rate Limits

- Respect Google API quotas
- Default: 100 messages per fetch
- Use pagination for larger fetches
