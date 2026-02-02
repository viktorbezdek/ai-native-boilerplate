#!/usr/bin/env bash
# PWI Notification Script
# Sends macOS notifications with interactive buttons

set -e

TITLE="${1:-PWI Alert}"
MESSAGE="${2:-Notification}"
BUTTONS="${3:-OK}"
PRIORITY="${4:-medium}"
ITEM_ID="${5:-$(date +%s)}"

LOG_FILE="./logs/notifications.jsonl"
mkdir -p "$(dirname "$LOG_FILE")"

# Convert comma-separated buttons to osascript format
IFS=',' read -ra BUTTON_ARRAY <<< "$BUTTONS"
BUTTON_LIST=""
for btn in "${BUTTON_ARRAY[@]}"; do
    BUTTON_LIST="${BUTTON_LIST}\"${btn}\", "
done
BUTTON_LIST="${BUTTON_LIST%, }"

# Send notification based on priority
case "$PRIORITY" in
    critical)
        RESPONSE=$(osascript <<EOF
display dialog "$MESSAGE" with title "$TITLE" buttons {$BUTTON_LIST} default button 1 with icon stop
EOF
        ) || true
        ;;
    high)
        RESPONSE=$(osascript <<EOF
display dialog "$MESSAGE" with title "$TITLE" buttons {$BUTTON_LIST} default button 1 with icon caution giving up after 30
EOF
        ) || true
        ;;
    medium)
        RESPONSE=$(osascript <<EOF
display dialog "$MESSAGE" with title "$TITLE" buttons {$BUTTON_LIST} default button 1 giving up after 10
EOF
        ) || true
        ;;
    low)
        osascript -e "display notification \"$MESSAGE\" with title \"$TITLE\""
        RESPONSE="button returned:acknowledged"
        ;;
esac

# Extract button pressed
BUTTON_PRESSED=$(echo "$RESPONSE" | grep -o 'button returned:[^,]*' | cut -d: -f2 || echo "timeout")

# Log notification and response
echo "{\"id\":\"$ITEM_ID\",\"title\":\"$TITLE\",\"message\":\"$MESSAGE\",\"buttons\":\"$BUTTONS\",\"priority\":\"$PRIORITY\",\"response\":\"$BUTTON_PRESSED\",\"timestamp\":\"$(date -Iseconds)\"}" >> "$LOG_FILE"

# Handle callback based on response
CALLBACK_SCRIPT="$(dirname "$0")/handle_action.sh"
if [[ -x "$CALLBACK_SCRIPT" ]]; then
    "$CALLBACK_SCRIPT" "$BUTTON_PRESSED" "$ITEM_ID"
fi

# Output for caller
echo "$BUTTON_PRESSED"
