#!/usr/bin/env bash
# PWI Notification Callback Handler
# Routes button actions to appropriate handlers

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"

BUTTON_PRESSED="${1:-timeout}"
ITEM_ID="${2:-unknown}"
PRIORITY="${3:-medium}"

LOG_FILE="$PROJECT_DIR/logs/notification_actions.jsonl"
mkdir -p "$(dirname "$LOG_FILE")"

log_action() {
    local action="$1"
    local detail="$2"
    printf '{"item_id":"%s","button":"%s","action":"%s","detail":"%s","timestamp":"%s"}\n' \
        "$ITEM_ID" "$BUTTON_PRESSED" "$action" "$detail" "$(date -Iseconds)" >> "$LOG_FILE"
}

case "$BUTTON_PRESSED" in
    "View Report"|"View Now"|"View Log")
        # Open the latest relevant log file
        LATEST_LOG=$(ls -t "$PROJECT_DIR/logs/"*.json 2>/dev/null | head -1)
        if [[ -n "$LATEST_LOG" ]]; then
            if command -v open &>/dev/null; then
                open "$LATEST_LOG"
            elif command -v xdg-open &>/dev/null; then
                xdg-open "$LATEST_LOG"
            else
                echo "Latest log: $LATEST_LOG"
            fi
            log_action "opened_log" "$LATEST_LOG"
        else
            log_action "no_log_found" ""
        fi
        ;;

    "Snooze")
        # Write snooze marker for this item (1 hour)
        SNOOZE_UNTIL=$(date -d "+1 hour" -Iseconds 2>/dev/null || date -v+1H -Iseconds 2>/dev/null || echo "")
        if [[ -n "$SNOOZE_UNTIL" ]]; then
            printf '{"item_id":"%s","snooze_until":"%s"}\n' "$ITEM_ID" "$SNOOZE_UNTIL" \
                >> "$PROJECT_DIR/logs/snoozed_items.jsonl"
            log_action "snoozed" "$SNOOZE_UNTIL"
        fi
        ;;

    "Dismiss")
        log_action "dismissed" ""
        ;;

    "Fix Now")
        # Queue item for immediate processing in next update cycle
        printf '{"item_id":"%s","priority":"immediate","queued_at":"%s"}\n' \
            "$ITEM_ID" "$(date -Iseconds)" >> "$PROJECT_DIR/logs/action_queue.jsonl"
        log_action "queued_fix" "immediate"
        ;;

    "Approve"|"Yes")
        # Mark as approved for auto-execution
        printf '{"item_id":"%s","approved":true,"approved_at":"%s"}\n' \
            "$ITEM_ID" "$(date -Iseconds)" >> "$PROJECT_DIR/logs/approvals.jsonl"
        log_action "approved" ""
        ;;

    "Reject"|"No")
        printf '{"item_id":"%s","rejected":true,"rejected_at":"%s"}\n' \
            "$ITEM_ID" "$(date -Iseconds)" >> "$PROJECT_DIR/logs/approvals.jsonl"
        log_action "rejected" ""
        ;;

    "timeout"|"")
        log_action "timeout" ""
        ;;

    *)
        log_action "unknown_action" "$BUTTON_PRESSED"
        ;;
esac

exit 0
