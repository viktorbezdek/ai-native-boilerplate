#!/usr/bin/env bash
# PWI Update - Delta sync with focused 8-skill analysis
# Run daily via cron: 0 7 * * *
# Processes only new/changed items for quick daily updates

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$LOG_DIR/update_$TIMESTAMP.json"
SESSION_FILE="$LOG_DIR/.last_session_id"
CURSOR_FILE="$LOG_DIR/.sync_cursors"

cd "$PROJECT_DIR"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

log() {
    echo "[$(date -Iseconds)] $1"
}

log "Starting delta update..."
log "Log file: $LOG_FILE"

# Check for large pending delta (recommend full-process if too large)
if [[ -f "$CURSOR_FILE" ]]; then
    LAST_UPDATE=$(stat -c %Y "$CURSOR_FILE" 2>/dev/null || stat -f %m "$CURSOR_FILE" 2>/dev/null || echo "0")
    NOW=$(date +%s)
    DAYS_SINCE=$(( (NOW - LAST_UPDATE) / 86400 ))

    if [[ $DAYS_SINCE -gt 7 ]]; then
        log "WARNING: Last update was $DAYS_SINCE days ago. Consider running full-process instead."
    fi
fi

# Check if we should continue a previous session
CONTINUE_FLAG=""
if [[ -f "$SESSION_FILE" ]]; then
    LAST_SESSION=$(cat "$SESSION_FILE")
    if [[ -n "$LAST_SESSION" ]]; then
        log "Attempting to continue session: $LAST_SESSION"
        CONTINUE_FLAG="--continue $LAST_SESSION"
    fi
fi

# Run Claude with the update prompt
log "Invoking Claude for delta update..."

claude -p "@$SCRIPT_DIR/update_prompt.txt" \
    --output-format json \
    --allowedTools "Read,Write,Edit,Bash,Glob,Grep,Task,TodoWrite" \
    $CONTINUE_FLAG \
    > "$LOG_FILE" 2>&1 &

CLAUDE_PID=$!

# Quick timeout for delta (2 minutes max)
TIMEOUT=120
ELAPSED=0

while kill -0 $CLAUDE_PID 2>/dev/null; do
    sleep 10
    ELAPSED=$((ELAPSED + 10))

    if [[ $ELAPSED -ge $TIMEOUT ]]; then
        log "WARNING: Update taking longer than expected ($TIMEOUT seconds)"
        # Don't kill - let it finish, but log warning
    fi
done

wait $CLAUDE_PID
EXIT_CODE=$?

# Extract session ID for potential continuation
SESSION_ID=$(grep -o '"session_id":"[^"]*"' "$LOG_FILE" 2>/dev/null | cut -d'"' -f4 || echo "")
if [[ -n "$SESSION_ID" ]]; then
    echo "$SESSION_ID" > "$SESSION_FILE"
fi

# Update cursor timestamp
touch "$CURSOR_FILE"

# Extract delta counts
if [[ -f "$LOG_FILE" ]]; then
    DELTA_COUNT=$(grep -o '"total_new_items":[0-9]*' "$LOG_FILE" 2>/dev/null | cut -d: -f2 || echo "0")
    log "Processed $DELTA_COUNT new/changed items"

    # Check if delta was too large
    if [[ "$DELTA_COUNT" -gt 500 ]]; then
        log "WARNING: Large delta ($DELTA_COUNT items). Consider running full-process."
    fi
fi

if [[ $EXIT_CODE -eq 0 ]]; then
    log "Update completed successfully"

    # Check for critical findings
    CRITICAL=$(grep -c '"severity":"critical"' "$LOG_FILE" 2>/dev/null || echo "0")
    if [[ "$CRITICAL" -gt 0 ]]; then
        log "Found $CRITICAL critical items"
        if [[ -x "$PROJECT_DIR/.claude/skills/notify/notify.sh" ]]; then
            "$PROJECT_DIR/.claude/skills/notify/notify.sh" \
                "PWI Alert" \
                "$CRITICAL critical items detected" \
                "View Now,Snooze" \
                "high"
        fi
    fi
else
    log "Update failed with exit code $EXIT_CODE"
    log "Check log: $LOG_FILE"

    # Send failure notification
    if [[ -x "$PROJECT_DIR/.claude/skills/notify/notify.sh" ]]; then
        "$PROJECT_DIR/.claude/skills/notify/notify.sh" \
            "PWI Error" \
            "Daily update failed. Check logs." \
            "View Log,Dismiss" \
            "medium"
    fi
fi

# Cleanup old logs (keep last 14 days for daily updates)
find "$LOG_DIR" -name "update_*.json" -mtime +14 -delete 2>/dev/null || true

log "Update finished"
exit $EXIT_CODE
