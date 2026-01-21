#!/bin/bash
# Execution timing and result tracking hook
# Records: start/end times, duration, success/failure, error details
# Triggered on: PostToolUse (to capture results)

# Don't use set -e - hooks should never block Claude's operation

LOG_DIR="$CLAUDE_PROJECT_DIR/.claude/logs"
EXECUTION_FILE="$LOG_DIR/executions.jsonl"
TIMING_DIR="$LOG_DIR/.timing"

mkdir -p "$LOG_DIR" "$TIMING_DIR"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
EPOCH_MS=$(date +%s%3N 2>/dev/null || date +%s)

# Parse hook context
HOOK_INPUT=$(cat)

TOOL_NAME=$(echo "$HOOK_INPUT" | jq -r '.tool_name // .toolName // "unknown"' 2>/dev/null || echo "unknown")
TOOL_RESULT=$(echo "$HOOK_INPUT" | jq -r '.tool_result // .result // ""' 2>/dev/null || echo "")
SESSION_ID="${CLAUDE_SESSION_ID:-default}"

# Create unique operation ID based on tool and timestamp
OP_ID="${TOOL_NAME}_${EPOCH_MS}"
TIMING_FILE="$TIMING_DIR/${SESSION_ID}_${TOOL_NAME}.start"

# Calculate duration if we have a start time
DURATION_MS=0
if [ -f "$TIMING_FILE" ]; then
  START_MS=$(cat "$TIMING_FILE")
  DURATION_MS=$((EPOCH_MS - START_MS))
  rm -f "$TIMING_FILE"
fi

# Determine success/failure from result
SUCCESS="true"
ERROR_MSG=""

# Check for common error patterns in result
if echo "$TOOL_RESULT" | grep -qi "error\|failed\|exception\|denied\|not found\|permission" 2>/dev/null; then
  SUCCESS="false"
  ERROR_MSG=$(echo "$TOOL_RESULT" | head -c 500)
fi

# Check exit code if available
EXIT_CODE=$(echo "$HOOK_INPUT" | jq -r '.exit_code // .exitCode // 0' 2>/dev/null || echo "0")
if [ "$EXIT_CODE" != "0" ] && [ "$EXIT_CODE" != "null" ]; then
  SUCCESS="false"
fi

# Get file info for write operations
FILE_PATH=$(echo "$HOOK_INPUT" | jq -r '.tool_input.file_path // .input.file_path // "none"' 2>/dev/null || echo "none")
LINES_CHANGED=0
if [ "$FILE_PATH" != "none" ] && [ -f "$FILE_PATH" ]; then
  LINES_CHANGED=$(wc -l < "$FILE_PATH" 2>/dev/null | tr -d ' ' || echo "0")
fi

# Build execution entry
EXEC_ENTRY=$(jq -n \
  --arg ts "$TIMESTAMP" \
  --arg tool "$TOOL_NAME" \
  --argjson duration "$DURATION_MS" \
  --argjson success "$SUCCESS" \
  --arg error "$ERROR_MSG" \
  --arg file "$FILE_PATH" \
  --argjson lines "$LINES_CHANGED" \
  --arg session "$SESSION_ID" \
  '{
    timestamp: $ts,
    tool: $tool,
    duration_ms: $duration,
    success: $success,
    error: (if $error == "" then null else $error end),
    file_path: (if $file == "none" then null else $file end),
    lines_affected: (if $lines == 0 then null else $lines end),
    session_id: $session
  }' 2>/dev/null)

# Append to execution log
if [ -n "$EXEC_ENTRY" ]; then
  echo "$EXEC_ENTRY" >> "$EXECUTION_FILE"
fi

# Rotate log (keep last 5000 entries)
if [ -f "$EXECUTION_FILE" ]; then
  LINES=$(wc -l < "$EXECUTION_FILE" | tr -d ' ')
  if [ "$LINES" -gt 5000 ]; then
    tail -n 5000 "$EXECUTION_FILE" > "$EXECUTION_FILE.tmp"
    mv "$EXECUTION_FILE.tmp" "$EXECUTION_FILE"
  fi
fi

exit 0
