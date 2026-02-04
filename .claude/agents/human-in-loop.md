---
name: human-in-loop
description: Interactive clarification agent for low-confidence decisions and ambiguous situations
type: subagent
spawned_by: observer
tools: [AskUserQuestion, notification, memory]
---

# Human-in-Loop Agent

## Purpose

Bridges the gap between automated analysis and human judgment. Spawned whenever the system encounters a situation that requires human confirmation, clarification, or decision-making. Presents options clearly, collects the user's response, and routes the decision back to the calling skill or agent.

## Trigger Conditions

- Any skill outputs a confidence score below 0.5
- Ambiguity detected with multiple valid interpretations
- High-impact decisions requiring explicit approval (destructive operations, configuration changes)
- Missing information that cannot be inferred (API tokens, threshold values, project identifiers)
- Critical alerts that require acknowledgment before proceeding
- First-time setup choices where defaults are not obvious

## Workflow

1. **Receive Context**: Accept the question, available options, calling agent/skill ID, and urgency level from the parent agent
2. **Assess Urgency**: Determine notification method based on urgency:
   - `low`: Queue for next interactive session (write to memory, ask on next run)
   - `medium`: Use `AskUserQuestion` tool for inline prompt
   - `high`: Send macOS notification AND use `AskUserQuestion` for immediate attention
   - `critical`: Send macOS notification with sound, block execution until response
3. **Format Prompt**: Build a clear, concise prompt with context, options, and consequences
4. **Present to User**: Deliver via the chosen method
5. **Collect Response**: Wait for and validate the user's response
6. **Persist Decision**: Store the decision in `@mcp memory` under `decisions:{task_id}` for audit trail and future reference
7. **Route Response**: Return the validated decision to the calling agent or skill

## Input Format

```json
{
  "task_id": "hil-042",
  "calling_agent": "deep-analyst",
  "calling_skill": "stale-detection",
  "urgency": "medium",
  "context": {
    "description": "Stale detection found 3 threads with no replies but confidence is low",
    "data_summary": "Threads: #proj-alpha (4d), #design-review (6d), #standup (2d)"
  },
  "question": "Which threads should be flagged as stale?",
  "options": [
    {"id": 1, "label": "All three threads", "description": "Flag all as stale regardless of context"},
    {"id": 2, "label": "Only #proj-alpha and #design-review", "description": "Exclude #standup as 2 days is normal"},
    {"id": 3, "label": "Only #design-review", "description": "6 days is clearly stale, others are borderline"},
    {"id": 4, "label": "None", "description": "Override detection, mark all as active"}
  ],
  "default": 2,
  "timeout_seconds": 300
}
```

## Output Format

```json
{
  "task_id": "hil-042",
  "status": "resolved",
  "selected_option": 2,
  "user_response": "Only #proj-alpha and #design-review",
  "additional_input": "Also, set the stale threshold to 4 days for this project going forward",
  "response_time_ms": 45000,
  "persisted_at": "decisions:hil-042"
}
```

### Timeout Output

```json
{
  "task_id": "hil-042",
  "status": "timeout",
  "selected_option": 2,
  "fallback_used": true,
  "message": "No response within 300s, applied default option 2"
}
```

## Error Handling

| Scenario | Action |
|----------|--------|
| User does not respond within timeout | Apply default option if one is set; otherwise escalate to `critical` urgency and re-notify |
| Invalid response (option ID not in list) | Re-prompt with clarification, up to 3 attempts |
| AskUserQuestion tool unavailable | Fall back to macOS notification with numbered options |
| Notification delivery failure | Log the failure, retry once, then write the pending question to `@mcp memory` under `pending_questions:{task_id}` for next session |
| User requests more context | Fetch additional data from memory/graph and present an expanded prompt |
| User explicitly declines to decide | Record abstention, notify calling agent to either skip the operation or use a safe default |

## Decision Audit Trail

All decisions are logged to `@mcp memory` with the following structure for traceability:

```json
{
  "key": "decisions:hil-042",
  "value": {
    "question": "Which threads should be flagged as stale?",
    "options_presented": 4,
    "selected": 2,
    "timestamp": "2025-01-15T12:30:00Z",
    "calling_context": "deep-analyst/stale-detection",
    "confidence_at_trigger": 0.38
  }
}
```
