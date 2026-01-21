#!/bin/bash
# Comprehensive telemetry hook for full observability
# Tracks: tool usage, agents, tasks, skills, timing, costs
# Triggered on: PreToolUse, PostToolUse, Stop

# Don't use set -e - hooks should never block Claude's operation

LOG_DIR="$CLAUDE_PROJECT_DIR/.claude/logs"
TELEMETRY_FILE="$LOG_DIR/telemetry.jsonl"
METRICS_FILE="$LOG_DIR/metrics.json"

mkdir -p "$LOG_DIR"

# Get timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
EPOCH_MS=$(date +%s%3N 2>/dev/null || date +%s)

# Parse hook context from stdin (JSON)
HOOK_INPUT=$(cat)

# Extract fields from hook input
HOOK_EVENT="${CLAUDE_HOOK_EVENT:-unknown}"
TOOL_NAME=$(echo "$HOOK_INPUT" | jq -r '.tool_name // .toolName // "unknown"' 2>/dev/null || echo "unknown")
TOOL_INPUT=$(echo "$HOOK_INPUT" | jq -c '.tool_input // .input // {}' 2>/dev/null || echo "{}")
SESSION_ID="${CLAUDE_SESSION_ID:-$(echo "$TIMESTAMP" | md5 2>/dev/null | cut -c1-8 || echo "$TIMESTAMP" | md5sum 2>/dev/null | cut -c1-8 || echo "unknown")}"

# Detect context
AGENT_NAME="${CLAUDE_AGENT_NAME:-main}"
TASK_ID="${CLAUDE_TASK_ID:-none}"
SKILL_NAME="${CLAUDE_SKILL_NAME:-none}"
WORKFLOW_ID="${CLAUDE_WORKFLOW_ID:-none}"

# Extract file path if present (for file operations)
FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // .path // .filePath // "none"' 2>/dev/null || echo "none")

# Determine operation category
case "$TOOL_NAME" in
  Read|Glob|Grep) CATEGORY="read" ;;
  Write|Edit|MultiEdit|NotebookEdit) CATEGORY="write" ;;
  Bash) CATEGORY="execute" ;;
  Task) CATEGORY="agent" ;;
  Skill) CATEGORY="skill" ;;
  WebFetch|WebSearch) CATEGORY="web" ;;
  TodoWrite) CATEGORY="planning" ;;
  AskUserQuestion) CATEGORY="interaction" ;;
  *) CATEGORY="other" ;;
esac

# Build telemetry entry
TELEMETRY_ENTRY=$(jq -n \
  --arg ts "$TIMESTAMP" \
  --arg epoch "$EPOCH_MS" \
  --arg event "$HOOK_EVENT" \
  --arg tool "$TOOL_NAME" \
  --arg category "$CATEGORY" \
  --arg session "$SESSION_ID" \
  --arg agent "$AGENT_NAME" \
  --arg task "$TASK_ID" \
  --arg skill "$SKILL_NAME" \
  --arg workflow "$WORKFLOW_ID" \
  --arg file "$FILE_PATH" \
  --argjson input "$TOOL_INPUT" \
  '{
    timestamp: $ts,
    epoch_ms: ($epoch | tonumber),
    event: $event,
    tool: $tool,
    category: $category,
    session_id: $session,
    agent: $agent,
    task_id: $task,
    skill: $skill,
    workflow_id: $workflow,
    file_path: $file,
    input_summary: (if ($input | type) == "object" then ($input | keys) else [] end)
  }' 2>/dev/null)

# Append to telemetry log
if [ -n "$TELEMETRY_ENTRY" ]; then
  echo "$TELEMETRY_ENTRY" >> "$TELEMETRY_FILE"
fi

# Update real-time metrics
update_metrics() {
  local metrics_tmp="$METRICS_FILE.tmp"

  # Initialize or load existing metrics
  if [ -f "$METRICS_FILE" ]; then
    METRICS=$(cat "$METRICS_FILE")
  else
    METRICS='{
      "session_start": null,
      "last_updated": null,
      "tool_usage": {},
      "category_counts": {},
      "agent_spawns": 0,
      "skill_invocations": 0,
      "files_read": 0,
      "files_written": 0,
      "commands_executed": 0,
      "web_requests": 0,
      "user_interactions": 0,
      "errors": 0
    }'
  fi

  # Update metrics based on tool
  METRICS=$(echo "$METRICS" | jq \
    --arg ts "$TIMESTAMP" \
    --arg tool "$TOOL_NAME" \
    --arg cat "$CATEGORY" \
    '
    .last_updated = $ts |
    .session_start = (.session_start // $ts) |
    .tool_usage[$tool] = ((.tool_usage[$tool] // 0) + 1) |
    .category_counts[$cat] = ((.category_counts[$cat] // 0) + 1) |
    if $cat == "read" then .files_read += 1
    elif $cat == "write" then .files_written += 1
    elif $cat == "execute" then .commands_executed += 1
    elif $cat == "agent" then .agent_spawns += 1
    elif $cat == "skill" then .skill_invocations += 1
    elif $cat == "web" then .web_requests += 1
    elif $cat == "interaction" then .user_interactions += 1
    else . end
    ' 2>/dev/null)

  echo "$METRICS" > "$metrics_tmp"
  mv "$metrics_tmp" "$METRICS_FILE"
}

update_metrics

# Rotate telemetry log (keep last 10000 entries)
if [ -f "$TELEMETRY_FILE" ]; then
  LINES=$(wc -l < "$TELEMETRY_FILE" | tr -d ' ')
  if [ "$LINES" -gt 10000 ]; then
    tail -n 10000 "$TELEMETRY_FILE" > "$TELEMETRY_FILE.tmp"
    mv "$TELEMETRY_FILE.tmp" "$TELEMETRY_FILE"
  fi
fi

exit 0
