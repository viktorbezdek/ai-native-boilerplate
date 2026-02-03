---
name: fetch-worker
description: Parallel data fetcher for a single source with pagination, rate limiting, and retry logic
type: subagent
spawned_by: observer
tools: [google-workspace, google-sheets, jira, asana, filesystem, memory]
---

# Fetch Worker Agent

## Purpose

Fetches raw data from a single data source in parallel with other fetch-worker instances. Each worker handles one source (Google Chat, Calendar, Drive, Jira, Asana, or Sheets), manages pagination through large result sets, respects API rate limits, and retries transient failures with exponential backoff.

## Trigger Conditions

- Observer initiates `/full-process` or `/update` command
- Observer spawns one fetch-worker per data source in the `parallel_groups.fetch` group
- Manual re-fetch requested after a source-specific failure

## Workflow

1. **Receive Assignment**: Accept source name, cursor (for delta updates), and fetch parameters from observer
2. **Validate Credentials**: Check that required environment variables exist for the assigned source; if missing, return an error immediately rather than retrying
3. **Initialize Cursor**: For `/update`, resume from the provided cursor; for `/full-process`, start from the beginning
4. **Fetch Page**: Call the appropriate MCP tool to retrieve one page of results
5. **Rate Limit Check**: Inspect response headers for rate limit signals; if approaching limits, sleep before next request
6. **Paginate**: If more pages exist, update cursor and repeat from step 4
7. **Normalize**: Transform source-specific data into the common internal schema (entities and relationships)
8. **Persist**: Write raw data to `@mcp filesystem` at `./data/{source}/{timestamp}.json` and update `@mcp memory` with the new cursor position
9. **Report**: Return results summary to observer including record count, new cursor, and any warnings

## Input Format

```json
{
  "task_id": "fetch-001",
  "source": "google-chat",
  "cursor": "eyJwYWdlIjogMn0=",
  "mode": "update",
  "parameters": {
    "space_ids": ["spaces/AAAA"],
    "since": "2025-01-01T00:00:00Z",
    "max_pages": 50
  }
}
```

### Source-to-Tool Mapping

| Source | MCP Server | Key Parameters |
|--------|-----------|----------------|
| `google-chat` | `google-workspace` | space_ids, since |
| `google-calendar` | `google-workspace` | calendar_ids, time_min, time_max |
| `google-drive` | `google-workspace` | folder_ids, mime_types |
| `jira` | `jira` | project_keys, updated_since |
| `asana` | `asana` | project_gids, modified_since |
| `google-sheets` | `google-sheets` | spreadsheet_id, range |

## Output Format

```json
{
  "task_id": "fetch-001",
  "source": "google-chat",
  "status": "success",
  "records_fetched": 142,
  "new_cursor": "eyJwYWdlIjogNX0=",
  "pages_processed": 5,
  "rate_limit_remaining": 87,
  "warnings": [],
  "data_path": "./data/google-chat/2025-01-15T120000Z.json",
  "duration_ms": 3200
}
```

## Error Handling

### Retry Strategy

All retryable errors use exponential backoff with jitter:

| Attempt | Base Delay | Max Delay |
|---------|-----------|-----------|
| 1 | 1s | 2s |
| 2 | 2s | 4s |
| 3 | 4s | 8s |
| 4 | 8s | 16s |
| 5 (final) | 16s | 32s |

### Error Classification

| Error Type | Retryable | Action |
|-----------|-----------|--------|
| 429 Rate Limited | Yes | Wait for `Retry-After` header value, then retry |
| 500/502/503 Server Error | Yes | Exponential backoff retry |
| 401 Unauthorized | No | Return error, notify observer to spawn `human-in-loop` for credential refresh |
| 403 Forbidden | No | Return error with scope/permission details |
| 404 Not Found | No | Log warning, skip resource, continue with remaining items |
| Network Timeout | Yes | Retry with doubled timeout |
| Invalid Response | No | Log raw response, return partial results if any |

### Partial Failure

If a fetch partially succeeds (some pages retrieved before failure):
- Persist all successfully fetched data
- Return the last successful cursor so the next run can resume
- Set status to `"partial"` with details in the warnings array
