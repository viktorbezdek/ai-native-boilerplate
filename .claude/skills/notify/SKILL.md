---
name: notify
description: Sends macOS notifications with interactive buttons
version: 2.0.0
trigger:
  - pattern: "notify"
  - pattern: "alert"
  - pattern: "send notification"
tags:
  - notification
  - macos
  - interaction
confidence_threshold: 0.7
---

# Notification Skill

Sends interactive macOS notifications using osascript.

## Usage

```bash
./notify.sh "Title" "Message" "Button1,Button2,Button3"
```

## Notification Types

### Simple Alert

```bash
osascript -e 'display notification "Message" with title "PWI Alert"'
```

### Interactive Dialog

```bash
osascript <<EOF
display dialog "Message here" with title "PWI" buttons {"Send", "Edit", "Reject"} default button "Send"
EOF
```

### With Icon

```bash
osascript <<EOF
display dialog "Message" with title "PWI" with icon caution buttons {"OK", "Cancel"}
EOF
```

## Button Actions

| Button | Action | Callback |
|--------|--------|----------|
| Send | Execute suggested action | `handle_action send <id>` |
| Edit | Open editor with content | `handle_action edit <id>` |
| Reject | Dismiss notification | `handle_action reject <id>` |
| Snooze | Remind later | `handle_action snooze <id> <minutes>` |

## Callback Handler

Button responses trigger callback script:

```bash
#!/usr/bin/env bash
# handle_action.sh

ACTION="$1"
ITEM_ID="$2"

case "$ACTION" in
    send)
        # Execute the suggested action
        ./execute_action.sh "$ITEM_ID"
        ;;
    edit)
        # Open in default editor
        $EDITOR "./drafts/$ITEM_ID.txt"
        ;;
    reject)
        # Log rejection
        echo "{\"action\":\"reject\",\"id\":\"$ITEM_ID\",\"ts\":\"$(date -Iseconds)\"}" >> ./logs/notifications.jsonl
        ;;
    snooze)
        MINUTES="${3:-30}"
        # Schedule reminder
        echo "sleep ${MINUTES}m && ./notify.sh 'Reminder' 'Snoozed item' 'OK'" | at now
        ;;
esac
```

## Response Handling

Capture button response:

```bash
RESPONSE=$(osascript <<EOF
display dialog "$MESSAGE" buttons {"Send", "Edit", "Reject"} default button "Send"
EOF
)

BUTTON=$(echo "$RESPONSE" | grep -o 'button returned:[^,]*' | cut -d: -f2)

case "$BUTTON" in
    "Send") handle_action send "$ID" ;;
    "Edit") handle_action edit "$ID" ;;
    "Reject") handle_action reject "$ID" ;;
esac
```

## Priority Levels

| Priority | Behavior |
|----------|----------|
| critical | Sound + stay on screen |
| high | Sound + auto-dismiss 30s |
| medium | No sound + auto-dismiss 10s |
| low | Silent notification center only |

## Output Format

```json
{
  "notification_id": "notif_abc123",
  "sent_at": "2024-01-15T10:00:00Z",
  "title": "Reply Needed",
  "message": "Alice is waiting for response",
  "buttons": ["Send", "Edit", "Reject"],
  "response": {
    "button": "Send",
    "responded_at": "2024-01-15T10:01:30Z"
  }
}
```

## Integration

Works with analysis skills:
- `analyze-stale` → Notify on critical stale items
- `suggest-reply` → Notify with reply options
- `analyze-misalignment` → Notify on sync issues
