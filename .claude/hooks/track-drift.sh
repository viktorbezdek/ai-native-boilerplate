#!/bin/bash
# Drift detection hook
# Tracks: planned vs actual tasks, scope creep, unexpected file changes
# Triggered on: PostToolUse for TodoWrite and file operations

# Don't use set -e - hooks should never block Claude's operation

LOG_DIR="$CLAUDE_PROJECT_DIR/.claude/logs"
DRIFT_FILE="$LOG_DIR/drift.jsonl"
PLAN_STATE="$LOG_DIR/.plan-state.json"

mkdir -p "$LOG_DIR"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Parse hook context
HOOK_INPUT=$(cat)

TOOL_NAME=$(echo "$HOOK_INPUT" | jq -r '.tool_name // .toolName // "unknown"' 2>/dev/null || echo "unknown")
TOOL_INPUT=$(echo "$HOOK_INPUT" | jq -c '.tool_input // .input // {}' 2>/dev/null || echo "{}")

# Initialize plan state if not exists
if [ ! -f "$PLAN_STATE" ]; then
  echo '{"planned_tasks":[],"planned_files":[],"actual_files":[],"scope_additions":0,"completed_tasks":0}' > "$PLAN_STATE"
fi

CURRENT_STATE=$(cat "$PLAN_STATE")

# Track TodoWrite operations (planning phase)
if [ "$TOOL_NAME" = "TodoWrite" ]; then
  TODOS=$(echo "$TOOL_INPUT" | jq -c '.todos // []' 2>/dev/null || echo "[]")
  TODO_COUNT=$(echo "$TODOS" | jq 'length' 2>/dev/null || echo "0")
  PENDING_COUNT=$(echo "$TODOS" | jq '[.[] | select(.status == "pending")] | length' 2>/dev/null || echo "0")
  COMPLETED_COUNT=$(echo "$TODOS" | jq '[.[] | select(.status == "completed")] | length' 2>/dev/null || echo "0")

  # Detect scope additions (new pending tasks added after initial plan)
  PREV_PENDING=$(echo "$CURRENT_STATE" | jq '.planned_tasks | length' 2>/dev/null || echo "0")
  if [ "$PREV_PENDING" -gt 0 ] && [ "$PENDING_COUNT" -gt "$PREV_PENDING" ]; then
    SCOPE_ADDITION=$((PENDING_COUNT - PREV_PENDING))
    CURRENT_SCOPE=$(echo "$CURRENT_STATE" | jq '.scope_additions' 2>/dev/null || echo "0")
    NEW_SCOPE=$((CURRENT_SCOPE + SCOPE_ADDITION))

    # Log drift event
    DRIFT_ENTRY=$(jq -n \
      --arg ts "$TIMESTAMP" \
      --arg type "scope_creep" \
      --argjson added "$SCOPE_ADDITION" \
      --argjson total "$NEW_SCOPE" \
      '{
        timestamp: $ts,
        drift_type: $type,
        tasks_added: $added,
        total_scope_additions: $total,
        severity: (if $added > 3 then "high" elif $added > 1 then "medium" else "low" end)
      }')
    echo "$DRIFT_ENTRY" >> "$DRIFT_FILE"

    CURRENT_STATE=$(echo "$CURRENT_STATE" | jq --argjson scope "$NEW_SCOPE" '.scope_additions = $scope')
  fi

  # Update plan state
  CURRENT_STATE=$(echo "$CURRENT_STATE" | jq \
    --argjson todos "$TODOS" \
    --argjson completed "$COMPLETED_COUNT" \
    '.planned_tasks = $todos | .completed_tasks = $completed')

  echo "$CURRENT_STATE" > "$PLAN_STATE"
fi

# Track file operations for unexpected changes
if echo "$TOOL_NAME" | grep -qE "Write|Edit|MultiEdit" 2>/dev/null; then
  FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // .filePath // "unknown"' 2>/dev/null || echo "unknown")

  if [ "$FILE_PATH" != "unknown" ]; then
    # Get planned files from todos (if they mention file paths)
    PLANNED_FILES=$(echo "$CURRENT_STATE" | jq -r '.planned_tasks[]?.content // ""' 2>/dev/null | grep -oE '[a-zA-Z0-9_/-]+\.(ts|tsx|js|jsx|json|md|sh)' || echo "")

    # Check if file was in plan
    FILE_IN_PLAN="false"
    if echo "$PLANNED_FILES" | grep -qF "$(basename "$FILE_PATH")" 2>/dev/null; then
      FILE_IN_PLAN="true"
    fi

    # Track actual files modified
    CURRENT_STATE=$(echo "$CURRENT_STATE" | jq \
      --arg file "$FILE_PATH" \
      'if .actual_files | index($file) | not then .actual_files += [$file] else . end')

    # Log unplanned file modification (potential drift)
    if [ "$FILE_IN_PLAN" = "false" ]; then
      ACTUAL_COUNT=$(echo "$CURRENT_STATE" | jq '.actual_files | length')
      PLANNED_COUNT=$(echo "$CURRENT_STATE" | jq '.planned_tasks | length')

      # Check if we already logged drift for this file in this session (deduplication)
      ALREADY_LOGGED="false"
      if [ -f "$DRIFT_FILE" ]; then
        # Look in recent entries (last 50) for this file path
        if tail -n 50 "$DRIFT_FILE" 2>/dev/null | grep -qF "\"file_path\":\"$FILE_PATH\"" 2>/dev/null; then
          ALREADY_LOGGED="true"
        fi
      fi

      # Only flag as drift if we have a plan, this wasn't in it, and not already logged
      if [ "$PLANNED_COUNT" -gt 0 ] && [ "$ALREADY_LOGGED" = "false" ]; then
        DRIFT_ENTRY=$(jq -n \
          --arg ts "$TIMESTAMP" \
          --arg type "unplanned_file" \
          --arg file "$FILE_PATH" \
          '{
            timestamp: $ts,
            drift_type: $type,
            file_path: $file,
            severity: "low"
          }')
        echo "$DRIFT_ENTRY" >> "$DRIFT_FILE"
      fi
    fi

    echo "$CURRENT_STATE" > "$PLAN_STATE"
  fi
fi

# Rotate log (keep last 1000 entries)
if [ -f "$DRIFT_FILE" ]; then
  LINES=$(wc -l < "$DRIFT_FILE" | tr -d ' ')
  if [ "$LINES" -gt 1000 ]; then
    tail -n 1000 "$DRIFT_FILE" > "$DRIFT_FILE.tmp"
    mv "$DRIFT_FILE.tmp" "$DRIFT_FILE"
  fi
fi

exit 0
