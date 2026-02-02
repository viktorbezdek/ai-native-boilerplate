#!/usr/bin/env bash
# PWI Update - Delta sync and quick analysis
# Run daily via cron: 0 7 * * *

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$LOG_DIR/update_$TIMESTAMP.json"
SESSION_FILE="$LOG_DIR/.last_session_id"

cd "$PROJECT_DIR"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

echo "[$(date -Iseconds)] Starting update..."

# Check if we should continue a previous session
CONTINUE_FLAG=""
if [[ -f "$SESSION_FILE" ]]; then
    LAST_SESSION=$(cat "$SESSION_FILE")
    if [[ -n "$LAST_SESSION" ]]; then
        echo "Attempting to continue session: $LAST_SESSION"
        CONTINUE_FLAG="--continue $LAST_SESSION"
    fi
fi

# Run Claude with the update prompt
claude -p "@$SCRIPT_DIR/update_prompt.txt" \
    --output-format json \
    --allowedTools "Read,Write,Edit,Bash,Glob,Grep,Task,TodoWrite" \
    $CONTINUE_FLAG \
    > "$LOG_FILE" 2>&1

EXIT_CODE=$?

# Extract session ID for potential continuation
SESSION_ID=$(grep -o '"session_id":"[^"]*"' "$LOG_FILE" 2>/dev/null | cut -d'"' -f4 || echo "")
if [[ -n "$SESSION_ID" ]]; then
    echo "$SESSION_ID" > "$SESSION_FILE"
fi

if [[ $EXIT_CODE -eq 0 ]]; then
    echo "[$(date -Iseconds)] Update completed successfully"
    echo "Log: $LOG_FILE"
else
    echo "[$(date -Iseconds)] Update failed with exit code $EXIT_CODE"
    echo "Check log: $LOG_FILE"

    # Send failure notification
    if [[ -x "$PROJECT_DIR/.claude/skills/notify/notify.sh" ]]; then
        "$PROJECT_DIR/.claude/skills/notify/notify.sh" \
            "PWI Error" \
            "Daily update failed. Check logs." \
            "View Log,Dismiss" \
            "medium"
    fi
fi

exit $EXIT_CODE
