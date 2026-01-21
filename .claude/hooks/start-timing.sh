#!/bin/bash
# Start timing hook - records operation start time
# Triggered on: PreToolUse (before any tool execution)

LOG_DIR="$CLAUDE_PROJECT_DIR/.claude/logs"
TIMING_DIR="$LOG_DIR/.timing"

mkdir -p "$TIMING_DIR"

EPOCH_MS=$(date +%s%3N 2>/dev/null || date +%s)

# Parse hook context
HOOK_INPUT=$(cat)
TOOL_NAME=$(echo "$HOOK_INPUT" | jq -r '.tool_name // .toolName // "unknown"' 2>/dev/null || echo "unknown")
SESSION_ID="${CLAUDE_SESSION_ID:-default}"

# Record start time
TIMING_FILE="$TIMING_DIR/${SESSION_ID}_${TOOL_NAME}.start"
echo "$EPOCH_MS" > "$TIMING_FILE"

exit 0
