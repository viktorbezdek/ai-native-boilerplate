#!/bin/bash
# Log session information for self-improvement analysis
# Runs on session stop

LOG_DIR="$CLAUDE_PROJECT_DIR/.claude/logs"
LOG_FILE="$LOG_DIR/sessions.jsonl"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Get current timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Get git status summary
GIT_STATUS=""
if command -v git &> /dev/null && [ -d "$CLAUDE_PROJECT_DIR/.git" ]; then
  cd "$CLAUDE_PROJECT_DIR"
  CHANGED_FILES=$(git diff --name-only 2>/dev/null | wc -l | tr -d ' ')
  STAGED_FILES=$(git diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')
  GIT_STATUS="changed:$CHANGED_FILES,staged:$STAGED_FILES"
fi

# Create log entry (JSON Lines format)
LOG_ENTRY=$(cat <<EOF
{"timestamp":"$TIMESTAMP","project":"$CLAUDE_PROJECT_DIR","git":"$GIT_STATUS"}
EOF
)

# Append to log file
echo "$LOG_ENTRY" >> "$LOG_FILE"

# Keep only last 1000 entries to prevent unbounded growth
if [ -f "$LOG_FILE" ]; then
  LINES=$(wc -l < "$LOG_FILE")
  if [ "$LINES" -gt 1000 ]; then
    tail -n 1000 "$LOG_FILE" > "$LOG_FILE.tmp"
    mv "$LOG_FILE.tmp" "$LOG_FILE"
  fi
fi

exit 0
