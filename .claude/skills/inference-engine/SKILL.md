---
name: inference-engine
description: Adds inferred edges to KG (collaboratesWith, similarTo) using co-occurrence and community detection. Use when enriching the graph with implicit relationships.
version: 2.0.0
trigger:
  - pattern: "infer relationships"
  - pattern: "detect communities"
  - pattern: "enrich graph"
tags:
  - kg-enabled
  - enrichment
  - inference
confidence_threshold: 0.7
---

# Inference Engine

Add inferred edges to KG through pattern detection.

## Edge Inference

```python
import networkx as nx
from collections import defaultdict

def infer_collaborates_with(G, min_co_occurrences=3):
    """Infer collaboration edges from co-occurrences."""
    co_occurrences = defaultdict(int)

    # Find co-occurrences in issues/tasks
    for node, data in G.nodes(data=True):
        if data.get('type') in ['issue', 'task']:
            participants = data.get('participants', [])
            for i, p1 in enumerate(participants):
                for p2 in participants[i+1:]:
                    co_occurrences[(p1, p2)] += 1

    inferred = []
    for (p1, p2), count in co_occurrences.items():
        if count >= min_co_occurrences:
            confidence = min(0.95, 0.5 + count * 0.05)
            inferred.append({
                'source': p1, 'target': p2,
                'relation': 'collaborates_with',
                'confidence': round(confidence, 3),
                'evidence_count': count
            })

    return inferred
```

## Community Detection

```python
from networkx.algorithms import community

def detect_communities(G):
    """Detect communities for team/topic clustering."""
    # Extract subgraph of people
    people = [n for n, d in G.nodes(data=True) if d.get('type') == 'person']
    subgraph = G.subgraph(people)

    communities = list(community.greedy_modularity_communities(subgraph.to_undirected()))

    return [{'community_id': i, 'members': list(c), 'size': len(c)}
            for i, c in enumerate(communities)]
```

## Apply Inferred Edges

```python
def apply_inferred_edges(G, inferred_edges, min_confidence=0.6):
    """Add inferred edges to graph."""
    added = 0
    for edge in inferred_edges:
        if edge['confidence'] >= min_confidence:
            G.add_edge(edge['source'], edge['target'],
                relation_type=edge['relation'],
                inferred=True,
                confidence=edge['confidence'])
            added += 1
    return added
```

## Interactivity

Ask user when confidence uncertain: "Add inferred edge between {A} and {B}? (confidence: 0.45)"

## Output

```json
{
  "skill": "inference-engine",
  "inferred_edges": [{"source": "alice", "target": "bob", "relation": "collaborates_with", "confidence": 0.85}],
  "communities_detected": 4,
  "edges_added": 15,
  "confidence": 0.78
}
```
