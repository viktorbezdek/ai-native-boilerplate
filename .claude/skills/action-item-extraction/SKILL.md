---
name: action-item-extraction
description: Extracts inferred action items and links to tasks with assignee suggestions
version: 2.0.0
trigger:
  - pattern: "extract actions"
  - pattern: "find todos"
  - pattern: "action items"
tags:
  - analysis
  - relationship
  - kg-enabled
  - nlp
confidence_threshold: 0.65
---

# Action Item Extraction Skill

NLP-based extraction of action items with KG-enhanced assignee suggestions.

@import ../graph-update/SKILL.md

## Knowledge Graph Integration

### Link to Existing Tasks

```python
import networkx as nx

def find_matching_task(action_text, G):
    """Query KG for existing tasks matching extracted action."""

    # Get all task nodes
    tasks = [n for n, d in G.nodes(data=True) if d.get('type') in ['task', 'issue']]

    matches = []
    for task_id in tasks:
        task = G.nodes[task_id]
        similarity = calculate_semantic_similarity(action_text, task.get('summary', ''))

        if similarity > 0.7:
            matches.append({
                'task_id': task_id,
                'similarity': similarity,
                'status': task.get('status'),
                'assignee': task.get('assignee')
            })

    return sorted(matches, key=lambda x: x['similarity'], reverse=True)
```

### Assignee Suggestion from KG

```python
def suggest_assignee(action_item, context, G):
    """Suggest assignee based on KG expertise and availability."""

    suggestions = []

    # Factor 1: Who's mentioned in the context
    mentioned_people = extract_person_references(context)
    for person in mentioned_people:
        suggestions.append({
            'person_id': person,
            'reason': 'mentioned_in_context',
            'weight': 0.3
        })

    # Factor 2: Expertise from KG
    action_keywords = extract_keywords(action_item)
    for person_id in get_all_persons(G):
        expertise = G.nodes[person_id].get('expertise_areas', [])
        overlap = len(set(action_keywords) & set(expertise))
        if overlap > 0:
            suggestions.append({
                'person_id': person_id,
                'reason': 'expertise_match',
                'weight': 0.4 * (overlap / len(action_keywords))
            })

    # Factor 3: Current workload (inverse)
    for person_id in get_all_persons(G):
        workload = len([n for n in G.neighbors(person_id)
                        if G.nodes[n].get('status') not in ['completed', 'done']])
        availability_score = max(0, 1 - (workload / 20))
        suggestions.append({
            'person_id': person_id,
            'reason': 'availability',
            'weight': 0.3 * availability_score
        })

    # Aggregate scores
    aggregated = {}
    for s in suggestions:
        if s['person_id'] not in aggregated:
            aggregated[s['person_id']] = {'score': 0, 'reasons': []}
        aggregated[s['person_id']]['score'] += s['weight']
        aggregated[s['person_id']]['reasons'].append(s['reason'])

    return sorted(
        [{'person_id': k, **v} for k, v in aggregated.items()],
        key=lambda x: x['score'],
        reverse=True
    )[:3]
```

## NLP Action Extraction

```python
import torch
from transformers import pipeline

# Action extraction patterns
ACTION_PATTERNS = [
    r"(need to|should|must|will|going to|have to)\s+(.+?)(?:\.|$)",
    r"action[:\s]+(.+?)(?:\.|$)",
    r"todo[:\s]+(.+?)(?:\.|$)",
    r"@(\w+)\s+(please|can you|could you)\s+(.+?)(?:\.|$)"
]

def extract_action_items(text, source_id):
    """Extract action items using NLP patterns + transformer."""

    actions = []

    # Pattern-based extraction
    for pattern in ACTION_PATTERNS:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            action_text = match[-1] if isinstance(match, tuple) else match
            actions.append({
                'text': action_text.strip(),
                'extraction_method': 'pattern',
                'confidence': 0.7
            })

    # Transformer-based (for complex sentences)
    classifier = pipeline("zero-shot-classification")
    sentences = split_sentences(text)

    for sentence in sentences:
        result = classifier(sentence, ["action_item", "information", "question"])
        if result['labels'][0] == 'action_item' and result['scores'][0] > 0.6:
            actions.append({
                'text': sentence,
                'extraction_method': 'transformer',
                'confidence': result['scores'][0]
            })

    # Deduplicate
    return deduplicate_actions(actions)
```

## Probability Scoring

```python
def score_action_priority(action, context, G):
    """Score action item priority with confidence."""

    # Urgency indicators
    urgency_keywords = ['asap', 'urgent', 'critical', 'immediately', 'today', 'eod']
    has_urgency = any(kw in action['text'].lower() for kw in urgency_keywords)

    # Importance from context
    source_importance = G.nodes.get(context.get('source_id'), {}).get('importance', 0.5)

    # Mentioned entities importance
    mentioned = extract_entity_references(action['text'])
    entity_importance = max([G.nodes.get(e, {}).get('priority_score', 0.5) for e in mentioned], default=0.5)

    # Combined score
    priority_score = (
        (0.4 if has_urgency else 0.1) +
        source_importance * 0.3 +
        entity_importance * 0.3
    )

    return {
        'priority_score': round(min(1.0, priority_score), 3),
        'confidence': action['confidence'],
        'urgency_detected': has_urgency
    }
```

## Interactivity for Ambiguous Actions

```python
if action['confidence'] < 0.5:
    response = {
        "ambiguity_detected": True,
        "question": f"Is this an action item? '{action['text'][:100]}...'",
        "options": [
            {"id": 1, "label": "Yes, valid action item"},
            {"id": 2, "label": "No, just information"},
            {"id": 3, "label": "Partial - extract specific part"},
            {"id": 4, "label": "Already exists as task"}
        ],
        "extracted_from": context.get('source_id')
    }
    ask_user(response)
```

## Output JSON Format

```json
{
  "skill": "action-item-extraction",
  "timestamp": "2024-01-15T10:00:00Z",
  "results": [
    {
      "action_id": "action_001",
      "text": "Review the design doc and provide feedback",
      "source_id": "chat_abc123",
      "extraction_method": "pattern",
      "confidence": 0.82,
      "priority_score": 0.75,
      "urgency_detected": false,
      "existing_task_match": null,
      "suggested_assignees": [
        {
          "person_id": "alice@example.com",
          "score": 0.85,
          "reasons": ["mentioned_in_context", "expertise_match"]
        }
      ],
      "suggested_action": "Create new task in Asana"
    }
  ],
  "summary": {
    "sources_scanned": 50,
    "actions_extracted": 23,
    "matched_to_existing": 8,
    "new_tasks_suggested": 15,
    "high_priority": 5
  }
}
```

## Subagent Parallelism

```yaml
parallel_extraction:
  - subagent: nlp-extractor
    sources: messages[0:100]
  - subagent: nlp-extractor
    sources: transcripts[0:50]
  - subagent: task-matcher
    actions: extracted_actions
  - subagent: assignee-suggester
    actions: unmatched_actions
```
