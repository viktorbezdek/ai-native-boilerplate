---
name: memory
description: Manage project-level AI memory with claude-mem
arguments:
  - name: action
    description: "Action to perform: status, search, start, stop, clear"
    required: true
---

# Memory Management

Manage the project-level AI memory system powered by claude-mem.

## Usage

```bash
/memory <action> [query]
```

## Actions

### `status`
Check the status of the memory worker service.

### `start`
Start the memory worker service if not running.

### `stop`
Stop the memory worker service.

### `search <query>`
Search past sessions for relevant context. Uses semantic search to find related work.

### `clear`
Clear the project memory database (requires confirmation).

## How It Works

Claude-mem automatically captures:
- **Tool observations**: Every tool use is recorded with context
- **Session summaries**: AI-generated summaries at session end
- **Semantic embeddings**: For intelligent context retrieval

Memory is stored project-locally in `.claude/memory/`:
- `claude-mem.db` - SQLite database
- `chroma/` - Vector embeddings for semantic search

## Configuration

Memory settings are in `.claude/memory/settings.json`:
- `workerPort`: API port (default: 37778)
- `contextInjection.maxTokens`: Max tokens for context injection
- `privacy.excludePatterns`: Files to exclude from memory

## Privacy

Use `<private>` tags to exclude sensitive content:
```
<private>This content will not be stored</private>
```

## Examples

```bash
# Check memory service status
/memory status

# Search for authentication-related work
/memory search authentication flow

# Start the memory worker
/memory start

# Stop the memory worker
/memory stop
```

## Integration

The memory system integrates with the autonomous orchestrator:
- Learning engine can access historical patterns
- Signal processor receives memory-based insights
- Confidence engine uses past success rates

## Troubleshooting

If memory isn't capturing:
1. Check worker status: `/memory status`
2. Verify bun is installed: `bun --version`
3. Check logs: `tail -f .claude/memory/logs/*.log`
