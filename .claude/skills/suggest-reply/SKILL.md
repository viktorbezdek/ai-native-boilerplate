---
name: suggest-reply
description: Generates reply suggestions for pending messages
version: 1.0.0
trigger:
  - pattern: "suggest reply"
  - pattern: "draft response"
  - pattern: "help me reply"
tags:
  - analysis
  - communication
  - ai-assisted
mcp_server: memory
---

# Suggest Reply Skill

Generates contextual reply suggestions for pending messages.

@import ../fetch-google-chat/SKILL.md

## Configuration

```yaml
reply_config:
  pending_threshold_hours: 24
  max_suggestions: 3
  tone: "professional"  # professional, casual, brief
  include_context: true
```

## Detection

Find messages needing reply:
```python
pending = []
for message in graph.chat:
    if message.needs_my_reply:
        hours_waiting = now - message.timestamp
        if hours_waiting > threshold:
            pending.append(message)
```

## Context Gathering

For each pending message, gather:
1. **Thread history** - Previous messages in thread
2. **Sender profile** - From contacts graph (communication style)
3. **Related entities** - Issues, tasks, events mentioned
4. **Previous interactions** - Past replies to this person

```
@mcp memory get contact:{sender_email}
@mcp filesystem read ./graph/chat/{thread_id}/*
```

## Reply Generation

### Input to LLM

```json
{
  "message": "Original message text",
  "sender": {
    "name": "Alice",
    "communication_style": "direct, prefers bullet points"
  },
  "thread_context": ["previous messages..."],
  "related_work": ["ENG-123: Fix login bug"],
  "tone": "professional"
}
```

### Output Format

```json
{
  "analysis": "reply_suggestion",
  "message_id": "chat_abc123",
  "sender": "alice@example.com",
  "waiting_hours": 26,
  "suggestions": [
    {
      "id": 1,
      "text": "Hi Alice, thanks for flagging this...",
      "tone": "professional",
      "confidence": 0.85
    },
    {
      "id": 2,
      "text": "Got it, I'll take a look at ENG-123...",
      "tone": "brief",
      "confidence": 0.75
    }
  ],
  "context_used": ["thread history", "sender profile", "related issues"]
}
```

## User Interaction

Present suggestions with options:
1. **Send** - Send selected reply
2. **Edit** - Open for editing before send
3. **Reject** - Dismiss and write own reply

Via macOS notification:
```bash
osascript <<EOF
display dialog "Reply to Alice?\n\n${suggestion}" buttons {"Send", "Edit", "Reject"}
EOF
```

## Personality Integration

Uses `personality-analyzer` sub-agent output:
- Adapt tone to recipient's style
- Match formality level
- Use appropriate greeting/sign-off

## Memory Storage

Store sent replies for learning:
```
@mcp memory set reply:{message_id} {
  "suggestion_used": 1,
  "edited": true,
  "final_text": "...",
  "timestamp": "..."
}
```
