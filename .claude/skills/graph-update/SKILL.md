---
name: graph-update
description: Upserts entities into the local knowledge graph
version: 1.0.0
trigger:
  - pattern: "update graph"
  - pattern: "upsert"
  - pattern: "store in graph"
tags:
  - graph
  - storage
  - core
mcp_server: filesystem
---

# Graph Update Skill

Manages upsert operations for the local knowledge graph.

@import ../../graph/schema.json

## Usage

```
/graph-update <entity_type> <data>
```

## Operations

### Upsert Entity

Insert or update an entity by ID:

```bash
# Via MCP filesystem
@mcp filesystem write_file ./graph/{type}/{id}.json <data>
```

### Batch Upsert

For multiple entities:

```python
for entity in entities:
    id = generate_id(entity, schema.entities[type].id_pattern)
    path = f"./graph/{type}/{id}.json"
    upsert(path, entity)
```

## ID Generation

IDs generated from schema patterns:
- `message`: `{source}_{id}` → `google-chat_abc123`
- `event`: `{calendar}_{id}` → `primary_evt456`
- `issue`: `{key}` → `ENG-123`
- `task`: `{gid}` → `1234567890`

## Validation

Before upsert, validate against schema:
1. Check required fields present
2. Validate field types
3. Resolve references (links)

## Linking

Automatic link detection:
- Email addresses → contact entities
- Issue keys (ABC-123) → jira entities
- URLs → appropriate entity type

## Conflict Resolution

On update conflict:
1. Compare timestamps
2. Newer wins (by default)
3. Log conflict to `./logs/conflicts.jsonl`

## Memory Sync

After upsert, sync to shared memory:
```
@mcp memory set graph:{type}:{id} <metadata>
```

## Output

```json
{
  "operation": "upsert",
  "type": "message",
  "id": "google-chat_abc123",
  "action": "created|updated",
  "timestamp": "2024-01-15T10:00:00Z"
}
```
