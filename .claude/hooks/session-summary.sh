#!/usr/bin/env bash
# Session summary hook - runs on Stop
# Outputs summary of session activity

LOG_DIR="logs"
CHANGES_LOG="$LOG_DIR/changes.jsonl"
COMMANDS_LOG="$LOG_DIR/commands.jsonl"

echo "=== Session Summary ==="

# Count file changes
if [[ -f "$CHANGES_LOG" ]]; then
    CHANGE_COUNT=$(wc -l < "$CHANGES_LOG" 2>/dev/null || echo 0)
    echo "File changes: $CHANGE_COUNT"
fi

# Count commands
if [[ -f "$COMMANDS_LOG" ]]; then
    CMD_COUNT=$(wc -l < "$COMMANDS_LOG" 2>/dev/null || echo 0)
    echo "Commands run: $CMD_COUNT"
fi

echo "Session ended: $(date -Iseconds)"

exit 0
