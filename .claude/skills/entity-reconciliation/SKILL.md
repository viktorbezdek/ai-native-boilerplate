---
name: entity-reconciliation
description: Merges duplicate entities using probabilistic matching and updates KG in-place. Use when detecting duplicates, merging entities, or cleaning up the knowledge graph.
version: 2.0.0
trigger:
  - pattern: "reconcile entities"
  - pattern: "find duplicates"
  - pattern: "merge entities"
tags:
  - kg-enabled
  - deduplication
  - data-quality
confidence_threshold: 0.7
---

# Entity Reconciliation

Probabilistic entity matching with KG merge operations.

## Duplicate Detection

```python
import networkx as nx
from difflib import SequenceMatcher

def find_potential_duplicates(entity_type, G, threshold=0.7):
    """Find duplicate candidates using fuzzy matching."""
    entities = [(n, d) for n, d in G.nodes(data=True) if d.get('type') == entity_type]
    duplicates = []

    for i, (id1, data1) in enumerate(entities):
        for id2, data2 in entities[i+1:]:
            score = calculate_match_score(data1, data2)
            if score > threshold:
                duplicates.append({
                    'entity_a': id1,
                    'entity_b': id2,
                    'match_probability': round(score, 3),
                    'matching_fields': get_matching_fields(data1, data2)
                })

    return duplicates

def calculate_match_score(data1, data2):
    """Probabilistic matching across fields."""
    scores = []

    # Name/title similarity
    name1 = data1.get('name', data1.get('summary', ''))
    name2 = data2.get('name', data2.get('summary', ''))
    if name1 and name2:
        scores.append(('name', SequenceMatcher(None, name1.lower(), name2.lower()).ratio(), 0.4))

    # Email match (high weight)
    if data1.get('email') and data1.get('email') == data2.get('email'):
        scores.append(('email', 1.0, 0.5))

    # Date proximity
    date1 = data1.get('created_at')
    date2 = data2.get('created_at')
    if date1 and date2:
        diff = abs((date1 - date2).days)
        date_score = max(0, 1 - diff / 30)
        scores.append(('date', date_score, 0.1))

    # Weighted average
    if not scores:
        return 0
    return sum(s * w for _, s, w in scores) / sum(w for _, _, w in scores)
```

## KG Merge Operation

```python
def merge_entities(primary_id, secondary_id, G):
    """Merge secondary into primary, preserving edges."""

    # Transfer all edges from secondary to primary
    for pred in list(G.predecessors(secondary_id)):
        edge_data = G.edges[pred, secondary_id]
        if not G.has_edge(pred, primary_id):
            G.add_edge(pred, primary_id, **edge_data)

    for succ in list(G.successors(secondary_id)):
        edge_data = G.edges[secondary_id, succ]
        if not G.has_edge(primary_id, succ):
            G.add_edge(primary_id, succ, **edge_data)

    # Merge properties (primary wins conflicts)
    secondary_data = G.nodes[secondary_id]
    for key, value in secondary_data.items():
        if key not in G.nodes[primary_id]:
            G.nodes[primary_id][key] = value

    # Record merge
    G.nodes[primary_id].setdefault('merged_from', []).append(secondary_id)

    # Remove secondary
    G.remove_node(secondary_id)

    return {'merged_into': primary_id, 'removed': secondary_id}
```

## Interactivity for Uncertain Matches

```python
if match['match_probability'] < 0.5:
    response = {
        "ambiguity_detected": True,
        "question": f"Merge {match['entity_a']} and {match['entity_b']}?",
        "options": [
            {"id": 1, "label": "Yes, merge (A is primary)"},
            {"id": 2, "label": "Yes, merge (B is primary)"},
            {"id": 3, "label": "No, keep separate"},
            {"id": 4, "label": "Mark as related only"}
        ],
        "match_probability": match['match_probability']
    }
```

## Output

```json
{
  "skill": "entity-reconciliation",
  "duplicates_found": [
    {"entity_a": "contact:alice@old.com", "entity_b": "contact:alice@new.com", "match_probability": 0.85}
  ],
  "merges_performed": 3,
  "confidence": 0.78,
  "summary": {"scanned": 150, "duplicates": 8, "auto_merged": 3, "needs_review": 5}
}
```
