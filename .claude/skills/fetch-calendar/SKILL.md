---
name: fetch-calendar
description: Fetches events from Google Calendar
version: 1.0.0
trigger:
  - pattern: "fetch calendar"
  - pattern: "get events"
  - pattern: "meetings"
tags:
  - fetch
  - google
  - calendar
mcp_server: google-workspace
---

# Fetch Calendar Skill

Retrieves calendar events for meeting context in knowledge graph.

## Usage

```
/fetch-calendar [calendar_id] [--from DATE] [--to DATE] [--limit N]
```

## MCP Integration

Uses `google-workspace` MCP server to query Calendar API.

### Available Operations

1. **List Calendars** - Get all accessible calendars
2. **Get Events** - Fetch events from date range
3. **Get Event Details** - Full event with attendees, description

## Ambiguity Handling

### Multiple Calendars

If user has multiple calendars, **ask which to fetch**:

```json
{
  "ambiguity_detected": true,
  "options": [
    {"id": "primary", "name": "Primary Calendar"},
    {"id": "work@company.com", "name": "Work Calendar"},
    {"id": "team-calendar", "name": "Team Shared"}
  ],
  "question": "Which calendar(s) to fetch? (comma-separated numbers or 'all')"
}
```

### Date Range Unclear

If no date range specified:
- Default: last 7 days + next 7 days
- Ask if different range needed

## Output Format

Events stored in `./graph/calendar/` as JSON:

```json
{
  "id": "event_id",
  "title": "Weekly Standup",
  "start": "2024-01-15T09:00:00Z",
  "end": "2024-01-15T09:30:00Z",
  "attendees": ["alice@example.com", "bob@example.com"],
  "location": "Zoom",
  "description": "Weekly sync",
  "recurring": true,
  "meeting_link": "https://zoom.us/j/xxx"
}
```

## Linking

Calendar events link to:
- Chat messages (by date/attendees)
- Drive documents (meeting notes)
- Jira issues (mentioned in description)
