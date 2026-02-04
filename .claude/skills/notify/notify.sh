#!/usr/bin/env bash
# PWI Notification Script
# Sends notifications with interactive buttons
# Cross-platform: macOS (osascript), Linux (notify-send), fallback (stdout)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"

TITLE="${1:-PWI Alert}"
MESSAGE="${2:-Notification}"
BUTTONS="${3:-OK}"
PRIORITY="${4:-medium}"
ITEM_ID="${5:-$(date +%s)}"

LOG_FILE="$PROJECT_DIR/logs/notifications.jsonl"
mkdir -p "$(dirname "$LOG_FILE")"

# Sanitize inputs to prevent injection
sanitize() {
    local input="$1"
    # Remove characters that could be used for injection
    echo "$input" | tr -d '\\\"'"'"'`$(){}[]|;&<>!' | head -c 500
}

SAFE_TITLE=$(sanitize "$TITLE")
SAFE_MESSAGE=$(sanitize "$MESSAGE")

# Detect platform
detect_platform() {
    if [[ "$(uname -s)" == "Darwin" ]]; then
        echo "macos"
    elif command -v notify-send &>/dev/null; then
        echo "linux-desktop"
    elif command -v wall &>/dev/null; then
        echo "linux-tty"
    else
        echo "fallback"
    fi
}

PLATFORM=$(detect_platform)

# Convert comma-separated buttons to array
IFS=',' read -ra BUTTON_ARRAY <<< "$BUTTONS"

send_macos_notification() {
    local button_list=""
    for btn in "${BUTTON_ARRAY[@]}"; do
        local safe_btn
        safe_btn=$(sanitize "$btn")
        button_list="${button_list}\"${safe_btn}\", "
    done
    button_list="${button_list%, }"

    case "$PRIORITY" in
        critical)
            RESPONSE=$(osascript -e "display dialog \"$SAFE_MESSAGE\" with title \"$SAFE_TITLE\" buttons {$button_list} default button 1 with icon stop" 2>/dev/null) || true
            ;;
        high)
            RESPONSE=$(osascript -e "display dialog \"$SAFE_MESSAGE\" with title \"$SAFE_TITLE\" buttons {$button_list} default button 1 with icon caution giving up after 30" 2>/dev/null) || true
            ;;
        medium)
            RESPONSE=$(osascript -e "display dialog \"$SAFE_MESSAGE\" with title \"$SAFE_TITLE\" buttons {$button_list} default button 1 giving up after 10" 2>/dev/null) || true
            ;;
        low)
            osascript -e "display notification \"$SAFE_MESSAGE\" with title \"$SAFE_TITLE\"" 2>/dev/null || true
            RESPONSE="button returned:acknowledged"
            ;;
    esac

    echo "$RESPONSE" | grep -o 'button returned:[^,]*' | cut -d: -f2 || echo "timeout"
}

send_linux_notification() {
    local urgency="normal"
    case "$PRIORITY" in
        critical|high) urgency="critical" ;;
        medium) urgency="normal" ;;
        low) urgency="low" ;;
    esac

    notify-send --urgency="$urgency" "$SAFE_TITLE" "$SAFE_MESSAGE" 2>/dev/null || true
    echo "acknowledged"
}

send_tty_notification() {
    echo "[$PRIORITY] $SAFE_TITLE: $SAFE_MESSAGE" | wall 2>/dev/null || true
    echo "acknowledged"
}

send_fallback_notification() {
    echo "=== PWI NOTIFICATION ($PRIORITY) ==="
    echo "Title: $SAFE_TITLE"
    echo "Message: $SAFE_MESSAGE"
    echo "Buttons: $BUTTONS"
    echo "=================================="
    echo "acknowledged"
}

# Send notification based on platform
case "$PLATFORM" in
    macos) BUTTON_PRESSED=$(send_macos_notification) ;;
    linux-desktop) BUTTON_PRESSED=$(send_linux_notification) ;;
    linux-tty) BUTTON_PRESSED=$(send_tty_notification) ;;
    fallback) BUTTON_PRESSED=$(send_fallback_notification) ;;
esac

BUTTON_PRESSED="${BUTTON_PRESSED:-timeout}"

# Log notification and response
LOG_ENTRY=$(printf '{"id":"%s","title":"%s","message":"%s","buttons":"%s","priority":"%s","platform":"%s","response":"%s","timestamp":"%s"}' \
    "$ITEM_ID" "$SAFE_TITLE" "$SAFE_MESSAGE" "$BUTTONS" "$PRIORITY" "$PLATFORM" "$BUTTON_PRESSED" "$(date -Iseconds)")
echo "$LOG_ENTRY" >> "$LOG_FILE"

# Handle callback based on response
CALLBACK_SCRIPT="$SCRIPT_DIR/handle_action.sh"
if [[ -x "$CALLBACK_SCRIPT" ]]; then
    "$CALLBACK_SCRIPT" "$BUTTON_PRESSED" "$ITEM_ID" "$PRIORITY"
fi

# Output for caller
echo "$BUTTON_PRESSED"
