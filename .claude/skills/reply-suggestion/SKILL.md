---
name: reply-suggestion
description: Analyzes unanswered intents with personalized urgency scoring
version: 2.0.0
trigger:
  - pattern: "suggest replies"
  - pattern: "pending responses"
  - pattern: "unanswered messages"
tags:
  - analysis
  - core
  - kg-enabled
  - nlp
confidence_threshold: 0.7
---

# Reply Suggestion Skill

Deep analysis for unanswered messages with KG-enhanced personalization.

@import ../suggest-reply/SKILL.md
@import ../graph-update/SKILL.md

## Knowledge Graph Integration

### Sender History Query

```python
import networkx as nx

def get_sender_history(sender_email, G):
    """Query KG for sender interaction history."""

    sender_node = f"contact:{sender_email}"
    if sender_node not in G:
        return {'history': [], 'interaction_count': 0}

    # Get all message edges
    messages = [
        (u, v, d) for u, v, d in G.edges(sender_node, data=True)
        if d.get('relation_type') == 'sent_message'
    ]

    # Get response patterns
    response_times = []
    for msg_edge in messages:
        msg_id = msg_edge[1]
        replies = G.successors(msg_id)
        for reply in replies:
            if G.nodes[reply].get('is_my_reply'):
                response_times.append(G.edges[msg_id, reply].get('time_delta_hours'))

    avg_response_time = sum(response_times) / len(response_times) if response_times else 24

    return {
        'interaction_count': len(messages),
        'avg_response_time_hours': avg_response_time,
        'communication_style': G.nodes.get(sender_node, {}).get('communication_style'),
        'importance_score': G.nodes.get(sender_node, {}).get('importance', 0.5)
    }
```

### Intent Extraction (NLP)

```python
import torch
from transformers import pipeline

# Load intent classifier
intent_classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")

def extract_intent(message_text):
    """Extract message intent using NLP."""

    candidate_labels = [
        "question_needs_answer",
        "action_request",
        "information_sharing",
        "feedback_request",
        "scheduling_request",
        "escalation",
        "social_greeting"
    ]

    result = intent_classifier(message_text, candidate_labels)

    return {
        'primary_intent': result['labels'][0],
        'intent_confidence': result['scores'][0],
        'all_intents': dict(zip(result['labels'], result['scores']))
    }
```

## Urgency Probability Scoring

```python
def calculate_urgency_probability(message, sender_history, kg_context):
    """Compute urgency score with Bayesian inference."""

    # Base urgency factors
    hours_waiting = message['hours_since_received']
    intent = message['intent']
    sender_importance = sender_history.get('importance_score', 0.5)

    # Time decay urgency
    if hours_waiting > 48:
        time_urgency = 0.95
    elif hours_waiting > 24:
        time_urgency = 0.7
    elif hours_waiting > 8:
        time_urgency = 0.4
    else:
        time_urgency = 0.2

    # Intent-based urgency
    intent_weights = {
        'question_needs_answer': 0.8,
        'action_request': 0.9,
        'escalation': 0.95,
        'scheduling_request': 0.7,
        'feedback_request': 0.6,
        'information_sharing': 0.3,
        'social_greeting': 0.1
    }
    intent_urgency = intent_weights.get(intent['primary_intent'], 0.5)

    # KG-enhanced factors
    has_related_issues = len(kg_context.get('related_issues', [])) > 0
    is_blocker_related = kg_context.get('is_blocking', False)

    # Combined urgency probability
    urgency_prob = (
        time_urgency * 0.3 +
        intent_urgency * 0.3 +
        sender_importance * 0.2 +
        (0.15 if has_related_issues else 0) +
        (0.15 if is_blocker_related else 0)
    )

    confidence = min(1.0, intent['intent_confidence'] * 0.8 + 0.2)

    return {
        'urgency_probability': round(min(1.0, urgency_prob), 3),
        'confidence': round(confidence, 3),
        'factors': {
            'time_urgency': time_urgency,
            'intent_urgency': intent_urgency,
            'sender_importance': sender_importance
        }
    }
```

## Interactivity for Low Confidence

```python
if result['confidence'] < 0.5:
    response = {
        "ambiguity_detected": True,
        "question": f"Message intent unclear for: '{message_preview}'",
        "options": [
            {"id": 1, "label": "Needs immediate reply"},
            {"id": 2, "label": "Can wait"},
            {"id": 3, "label": "No reply needed"},
            {"id": 4, "label": "Forward to someone else"}
        ],
        "context": {
            "sender": sender_email,
            "hours_waiting": hours_waiting,
            "detected_intent": intent['primary_intent']
        }
    }
    ask_user(response)
```

## Reply Generation

```python
def generate_reply_suggestions(message, sender_history, urgency, count=3):
    """Generate personalized reply suggestions."""

    style = sender_history.get('communication_style', 'professional')

    prompts = {
        'professional': "formal, structured response",
        'casual': "friendly, conversational tone",
        'brief': "short, direct response"
    }

    # Generate via LLM with context
    suggestions = []
    for i in range(count):
        suggestion = generate_reply(
            message=message,
            style=prompts[style],
            context=f"Sender typically gets {sender_history['avg_response_time_hours']}h responses"
        )
        suggestions.append({
            'id': i + 1,
            'text': suggestion,
            'style': style,
            'confidence': 0.8 - (i * 0.1)
        })

    return suggestions
```

## Output JSON Format

```json
{
  "skill": "reply-suggestion",
  "timestamp": "2024-01-15T10:00:00Z",
  "results": [
    {
      "message_id": "chat_abc123",
      "sender": "alice@example.com",
      "hours_waiting": 26,
      "intent": {
        "primary": "question_needs_answer",
        "confidence": 0.89
      },
      "urgency_probability": 0.82,
      "confidence": 0.85,
      "kg_context": {
        "sender_importance": 0.8,
        "interaction_history": 45,
        "related_issues": ["ENG-123"]
      },
      "suggestions": [
        {"id": 1, "text": "Hi Alice, thanks for...", "confidence": 0.85}
      ],
      "suggested_action": "Reply within 2 hours"
    }
  ],
  "summary": {
    "pending_messages": 8,
    "high_urgency": 3,
    "medium_urgency": 4,
    "low_urgency": 1
  }
}
```

## Subagent Parallelism

```yaml
parallel_analysis:
  - subagent: intent-extractor
    messages: pending_messages[0:20]
  - subagent: reply-generator
    messages: high_urgency_messages
```
