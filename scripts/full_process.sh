#!/usr/bin/env bash
# PWI Full Process - Complete knowledge graph rebuild
# Run weekly via cron: 0 3 * * 0

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$LOG_DIR/full_process_$TIMESTAMP.json"

cd "$PROJECT_DIR"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

echo "[$(date -Iseconds)] Starting full-process..."

# Run Claude with the full process prompt
claude -p "@$SCRIPT_DIR/full_process_prompt.txt" \
    --output-format json \
    --allowedTools "Read,Write,Edit,Bash,Glob,Grep,Task,TodoWrite" \
    > "$LOG_FILE" 2>&1

EXIT_CODE=$?

if [[ $EXIT_CODE -eq 0 ]]; then
    echo "[$(date -Iseconds)] Full process completed successfully"
    echo "Log: $LOG_FILE"
else
    echo "[$(date -Iseconds)] Full process failed with exit code $EXIT_CODE"
    echo "Check log: $LOG_FILE"

    # Send failure notification
    if [[ -x "$PROJECT_DIR/.claude/skills/notify/notify.sh" ]]; then
        "$PROJECT_DIR/.claude/skills/notify/notify.sh" \
            "PWI Error" \
            "Full process failed. Check logs." \
            "View Log,Dismiss" \
            "high"
    fi
fi

exit $EXIT_CODE
