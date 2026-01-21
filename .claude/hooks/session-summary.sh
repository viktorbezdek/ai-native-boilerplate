#!/bin/bash
# Comprehensive session summary hook
# Aggregates all metrics on session end: tools, timing, quality, drift, costs
# Triggered on: Stop

# Don't use set -e - hooks should never block Claude's operation

LOG_DIR="$CLAUDE_PROJECT_DIR/.claude/logs"
SESSIONS_FILE="$LOG_DIR/sessions.jsonl"
METRICS_FILE="$LOG_DIR/metrics.json"
TELEMETRY_FILE="$LOG_DIR/telemetry.jsonl"
QUALITY_FILE="$LOG_DIR/quality.jsonl"
DRIFT_FILE="$LOG_DIR/drift.jsonl"
EXECUTION_FILE="$LOG_DIR/executions.jsonl"
PLAN_STATE="$LOG_DIR/.plan-state.json"

mkdir -p "$LOG_DIR"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
SESSION_ID="${CLAUDE_SESSION_ID:-$(date +%s)}"

# Get session start time from metrics
SESSION_START="$TIMESTAMP"
if [ -f "$METRICS_FILE" ]; then
  SESSION_START=$(jq -r '.session_start // empty' "$METRICS_FILE" 2>/dev/null || echo "$TIMESTAMP")
fi

# Calculate session duration
START_EPOCH=$(date -d "$SESSION_START" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$SESSION_START" +%s 2>/dev/null || echo "0")
END_EPOCH=$(date +%s)
DURATION_SECONDS=$((END_EPOCH - START_EPOCH))

# Aggregate tool usage from metrics
TOOL_USAGE="{}"
CATEGORY_COUNTS="{}"
TOTAL_OPERATIONS=0
if [ -f "$METRICS_FILE" ]; then
  TOOL_USAGE=$(jq -c '.tool_usage // {}' "$METRICS_FILE" 2>/dev/null || echo "{}")
  CATEGORY_COUNTS=$(jq -c '.category_counts // {}' "$METRICS_FILE" 2>/dev/null || echo "{}")
  TOTAL_OPERATIONS=$(jq '[.tool_usage | to_entries[].value] | add // 0' "$METRICS_FILE" 2>/dev/null || echo "0")
fi

# Aggregate execution stats
AVG_DURATION=0
SUCCESS_RATE=100
ERROR_COUNT=0
if [ -f "$EXECUTION_FILE" ]; then
  # Get session executions
  EXEC_STATS=$(tail -n 1000 "$EXECUTION_FILE" | jq -s '
    {
      total: length,
      successes: [.[] | select(.success == true)] | length,
      failures: [.[] | select(.success == false)] | length,
      avg_duration: ([.[].duration_ms] | add / length // 0)
    }' 2>/dev/null || echo '{"total":0,"successes":0,"failures":0,"avg_duration":0}')

  AVG_DURATION=$(echo "$EXEC_STATS" | jq '.avg_duration // 0')
  TOTAL_EXEC=$(echo "$EXEC_STATS" | jq '.total // 1')
  SUCCESSES=$(echo "$EXEC_STATS" | jq '.successes // 0')
  ERROR_COUNT=$(echo "$EXEC_STATS" | jq '.failures // 0')
  if [ "$TOTAL_EXEC" -gt 0 ]; then
    SUCCESS_RATE=$(echo "scale=1; $SUCCESSES * 100 / $TOTAL_EXEC" | bc 2>/dev/null || echo "100")
  fi
fi

# Aggregate quality metrics
QUALITY_SUMMARY='{"tests":{"passed":0,"failed":0},"lint":{"errors":0,"warnings":0},"builds":{"success":0,"failed":0}}'
if [ -f "$QUALITY_FILE" ]; then
  QUALITY_SUMMARY=$(tail -n 500 "$QUALITY_FILE" | jq -s '
    {
      tests: {
        passed: [.[] | select(.type == "test") | .metrics.passed // 0] | add // 0,
        failed: [.[] | select(.type == "test") | .metrics.failed // 0] | add // 0
      },
      lint: {
        errors: [.[] | select(.type == "lint") | .metrics.errors // 0] | add // 0,
        warnings: [.[] | select(.type == "lint") | .metrics.warnings // 0] | add // 0
      },
      builds: {
        success: [.[] | select(.type == "build" and .metrics.success == true)] | length,
        failed: [.[] | select(.type == "build" and .metrics.success == false)] | length
      }
    }' 2>/dev/null || echo "$QUALITY_SUMMARY")
fi

# Aggregate drift metrics
DRIFT_SUMMARY='{"scope_additions":0,"unplanned_files":0,"severity":"none"}'
if [ -f "$DRIFT_FILE" ]; then
  DRIFT_SUMMARY=$(tail -n 100 "$DRIFT_FILE" | jq -s '
    {
      scope_additions: [.[] | select(.drift_type == "scope_creep") | .tasks_added // 0] | add // 0,
      unplanned_files: [.[] | select(.drift_type == "unplanned_file")] | length,
      severity: (
        if ([.[] | select(.severity == "high")] | length) > 0 then "high"
        elif ([.[] | select(.severity == "medium")] | length) > 0 then "medium"
        elif length > 0 then "low"
        else "none" end
      )
    }' 2>/dev/null || echo "$DRIFT_SUMMARY")
fi

# Get task completion stats from plan state
TASK_SUMMARY='{"planned":0,"completed":0,"completion_rate":0}'
if [ -f "$PLAN_STATE" ]; then
  PLANNED=$(jq '.planned_tasks | length // 0' "$PLAN_STATE" 2>/dev/null || echo "0")
  COMPLETED=$(jq '.completed_tasks // 0' "$PLAN_STATE" 2>/dev/null || echo "0")
  COMP_RATE=0
  if [ "$PLANNED" -gt 0 ]; then
    COMP_RATE=$(echo "scale=1; $COMPLETED * 100 / $PLANNED" | bc 2>/dev/null || echo "0")
  fi
  TASK_SUMMARY=$(jq -n \
    --argjson planned "$PLANNED" \
    --argjson completed "$COMPLETED" \
    --argjson rate "$COMP_RATE" \
    '{planned: $planned, completed: $completed, completion_rate: $rate}')
fi

# Git stats
GIT_STATS='{"changed":0,"staged":0,"commits":0}'
if command -v git &> /dev/null && [ -d "$CLAUDE_PROJECT_DIR/.git" ]; then
  cd "$CLAUDE_PROJECT_DIR"
  CHANGED=$(git diff --name-only 2>/dev/null | wc -l | tr -d ' ')
  STAGED=$(git diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')
  # Count commits in this session (rough estimate: last hour)
  COMMITS=$(git log --since="1 hour ago" --oneline 2>/dev/null | wc -l | tr -d ' ')
  GIT_STATS=$(jq -n \
    --argjson changed "$CHANGED" \
    --argjson staged "$STAGED" \
    --argjson commits "$COMMITS" \
    '{changed: $changed, staged: $staged, commits: $commits}')
fi

# Build comprehensive session summary
SESSION_SUMMARY=$(jq -n \
  --arg ts "$TIMESTAMP" \
  --arg start "$SESSION_START" \
  --arg session "$SESSION_ID" \
  --argjson duration "$DURATION_SECONDS" \
  --argjson ops "$TOTAL_OPERATIONS" \
  --argjson tools "$TOOL_USAGE" \
  --argjson categories "$CATEGORY_COUNTS" \
  --argjson avg_dur "$AVG_DURATION" \
  --argjson success_rate "$SUCCESS_RATE" \
  --argjson errors "$ERROR_COUNT" \
  --argjson quality "$QUALITY_SUMMARY" \
  --argjson drift "$DRIFT_SUMMARY" \
  --argjson tasks "$TASK_SUMMARY" \
  --argjson git "$GIT_STATS" \
  '{
    timestamp: $ts,
    session_id: $session,
    session_start: $start,
    duration_seconds: $duration,
    summary: {
      total_operations: $ops,
      avg_operation_ms: $avg_dur,
      success_rate_pct: $success_rate,
      error_count: $errors
    },
    tool_usage: $tools,
    categories: $categories,
    quality: $quality,
    drift: $drift,
    tasks: $tasks,
    git: $git
  }')

# Append to sessions log
echo "$SESSION_SUMMARY" >> "$SESSIONS_FILE"

# Clean up temporary state files
rm -f "$LOG_DIR/.plan-state.json"
rm -rf "$LOG_DIR/.timing"
rm -f "$METRICS_FILE"

# Rotate sessions log (keep last 500 entries)
if [ -f "$SESSIONS_FILE" ]; then
  LINES=$(wc -l < "$SESSIONS_FILE" | tr -d ' ')
  if [ "$LINES" -gt 500 ]; then
    tail -n 500 "$SESSIONS_FILE" > "$SESSIONS_FILE.tmp"
    mv "$SESSIONS_FILE.tmp" "$SESSIONS_FILE"
  fi
fi

# Print summary to console (optional, for visibility)
echo "Session Summary:"
echo "  Duration: ${DURATION_SECONDS}s"
echo "  Operations: $TOTAL_OPERATIONS"
echo "  Success Rate: ${SUCCESS_RATE}%"
echo "  Tasks: $(echo "$TASK_SUMMARY" | jq -r '"\(.completed)/\(.planned) completed"')"

exit 0
