---
name: misalignment-check
description: Cross-references conflicts and computes alignment scores
version: 2.0.0
trigger:
  - pattern: "check alignment"
  - pattern: "find conflicts"
  - pattern: "sync issues"
tags:
  - analysis
  - core
  - kg-enabled
confidence_threshold: 0.7
---

# Misalignment Check Skill

Deep analysis for detecting cross-system conflicts with inferred alignment scoring.

@import ../graph-update/SKILL.md
@import ../analyze-misalignment/SKILL.md

## Knowledge Graph Integration

### Related Entity Query

```python
import networkx as nx

def query_related_entities(entity_id, relation_types=['references', 'blocks', 'duplicates']):
    """Traverse KG for related entities across systems."""

    related = {}
    for rtype in relation_types:
        # Find edges of this relation type
        edges = [(u, v, d) for u, v, d in G.edges(data=True)
                 if d.get('relation_type') == rtype and (u == entity_id or v == entity_id)]
        related[rtype] = edges

    return related

def find_shortest_path_conflicts(source_id, target_id):
    """Find conflict chains via shortest path."""
    try:
        path = nx.shortest_path(G, source_id, target_id)
        return path
    except nx.NetworkXNoPath:
        return None
```

### Cross-System Entity Matching

```python
def match_cross_system_entities(jira_issue, asana_tasks):
    """Probabilistic matching for same-work detection."""

    matches = []
    for task in asana_tasks:
        # Title similarity
        title_sim = calculate_similarity(jira_issue['summary'], task['name'])

        # Assignee match
        assignee_match = jira_issue.get('assignee') == task.get('assignee')

        # Date proximity
        date_diff = abs((jira_issue['due_date'] - task['due_on']).days) if both_have_dates else 999

        # Compute match probability
        match_prob = (title_sim * 0.5) + (0.3 if assignee_match else 0) + (0.2 if date_diff < 3 else 0)

        if match_prob > 0.6:
            matches.append({
                'jira': jira_issue['key'],
                'asana': task['gid'],
                'match_probability': round(match_prob, 3)
            })

    return matches
```

## Alignment Score Inference

```python
def compute_alignment_score(entity_pair):
    """Compute inferred alignment score between cross-system entities."""

    checks = {
        'status_aligned': compare_status(entity_pair),      # 0-1
        'assignee_aligned': compare_assignee(entity_pair),  # 0 or 1
        'due_date_aligned': compare_dates(entity_pair),     # 0-1
        'priority_aligned': compare_priority(entity_pair),  # 0 or 1
        'description_coherent': semantic_similarity(entity_pair)  # 0-1
    }

    weights = {
        'status_aligned': 0.3,
        'assignee_aligned': 0.25,
        'due_date_aligned': 0.2,
        'priority_aligned': 0.15,
        'description_coherent': 0.1
    }

    alignment_score_inferred = sum(checks[k] * weights[k] for k in checks)
    confidence = min(1.0, alignment_score_inferred + 0.1)  # Slight boost for having data

    return {
        'alignment_score_inferred': round(alignment_score_inferred, 3),
        'confidence': round(confidence, 3),
        'breakdown': checks
    }
```

## Conflict Detection

```python
CONFLICT_TYPES = {
    'status_mismatch': {'threshold': 0.4, 'severity': 'high'},
    'assignee_mismatch': {'threshold': 0.0, 'severity': 'medium'},
    'date_conflict': {'threshold': 3, 'severity': 'medium'},  # days
    'duplicate_work': {'threshold': 0.8, 'severity': 'high'}
}
```

## Interactivity for Ambiguous Matches

When alignment confidence < 0.5:

```python
if alignment['confidence'] < 0.5:
    response = {
        "ambiguity_detected": True,
        "question": f"Uncertain if {jira_key} and {asana_gid} represent same work",
        "options": [
            {"id": 1, "label": "Yes, same work - merge"},
            {"id": 2, "label": "No, different work"},
            {"id": 3, "label": "Partially related - link only"}
        ],
        "context": alignment['breakdown']
    }
    ask_user(response)
```

## Output JSON Format

```json
{
  "skill": "misalignment-check",
  "timestamp": "2024-01-15T10:00:00Z",
  "results": [
    {
      "entity_pair": ["ENG-123", "asana:456"],
      "alignment_score_inferred": 0.45,
      "confidence": 0.72,
      "conflicts": [
        {
          "type": "status_mismatch",
          "details": {"jira": "Done", "asana": "In Progress"},
          "severity": "high"
        }
      ],
      "kg_path": ["ENG-123", "relates_to", "asana:456"],
      "suggested_action": "Sync status: mark Asana complete"
    }
  ],
  "summary": {
    "pairs_checked": 45,
    "misalignments_found": 8,
    "high_severity": 3,
    "medium_severity": 5
  }
}
```

## Subagent Parallelism

```yaml
parallel_comparison:
  - subagent: align-checker-jira-asana
    pairs: cross_matches[jira, asana]
  - subagent: align-checker-chat-calendar
    pairs: cross_matches[chat, calendar]
```
