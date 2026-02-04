---
name: innovation-opportunity-spotting
description: Identifies underexplored KG regions and suggests novel connections for innovation
version: 2.0.0
trigger:
  - pattern: "find opportunities"
  - pattern: "spot innovation"
  - pattern: "unexplored areas"
tags:
  - analysis
  - kg-enabled
  - innovation
confidence_threshold: 0.6
---

# Innovation Opportunity Spotting Skill

Analyzes KG structure to identify underexplored regions and novel connection opportunities.

@import ../knowledge-gap-filler/SKILL.md
@import ../semantic-enrichment/SKILL.md

## Structural Hole Detection

```python
import networkx as nx
import numpy as np

def find_structural_holes(G):
    """Identify structural holes - gaps between dense clusters."""

    # Calculate constraint (inverse of structural holes)
    try:
        constraint = nx.constraint(G)
        confidence = 0.85
    except:
        constraint = {n: 0.5 for n in G.nodes()}
        confidence = 0.5

    # Low constraint = high structural hole opportunity
    opportunities = []
    for node, c in constraint.items():
        if c < 0.3:  # Low constraint = bridges structural holes
            opportunities.append({
                'node_id': node,
                'constraint': round(c, 3),
                'opportunity_score': round(1 - c, 3),
                'type': G.nodes[node].get('type', 'unknown'),
                'neighbors': list(G.neighbors(node))[:5]
            })

    return {
        'structural_holes': sorted(opportunities, key=lambda x: x['opportunity_score'], reverse=True),
        'confidence': confidence
    }

def detect_weak_ties(G, threshold=2):
    """Find weak ties that could be strengthened for innovation."""

    weak_ties = []

    for u, v, data in G.edges(data=True):
        weight = data.get('weight', 1)
        interaction_count = data.get('interaction_count', 1)

        if interaction_count <= threshold:
            # Check if bridging different communities
            u_neighbors = set(G.neighbors(u))
            v_neighbors = set(G.neighbors(v))
            overlap = len(u_neighbors & v_neighbors)
            total = len(u_neighbors | v_neighbors)

            bridge_score = 1 - (overlap / total) if total > 0 else 0

            if bridge_score > 0.5:
                weak_ties.append({
                    'source': u,
                    'target': v,
                    'interaction_count': interaction_count,
                    'bridge_score': round(bridge_score, 3),
                    'innovation_potential': round(bridge_score * 0.7, 3)
                })

    return sorted(weak_ties, key=lambda x: x['innovation_potential'], reverse=True)
```

## Underexplored Region Analysis

```python
def find_underexplored_regions(G, min_density=0.1):
    """Find sparse regions in the KG that may contain opportunities."""

    # Group nodes by type
    type_groups = {}
    for node, data in G.nodes(data=True):
        node_type = data.get('type', 'unknown')
        type_groups.setdefault(node_type, []).append(node)

    underexplored = []

    for type_a, nodes_a in type_groups.items():
        for type_b, nodes_b in type_groups.items():
            if type_a >= type_b:
                continue

            # Count cross-type edges
            cross_edges = sum(1 for u in nodes_a for v in G.neighbors(u) if v in nodes_b)
            max_edges = len(nodes_a) * len(nodes_b)
            density = cross_edges / max_edges if max_edges > 0 else 0

            if density < min_density and max_edges > 10:
                underexplored.append({
                    'region': f"{type_a}-{type_b}",
                    'type_a': type_a,
                    'type_b': type_b,
                    'current_edges': cross_edges,
                    'potential_edges': max_edges,
                    'density': round(density, 4),
                    'opportunity_score': round((1 - density) * min(1, max_edges / 100), 3)
                })

    return sorted(underexplored, key=lambda x: x['opportunity_score'], reverse=True)

def suggest_novel_connections(G, underexplored_region):
    """Suggest specific novel connections based on semantic similarity."""

    type_a = underexplored_region['type_a']
    type_b = underexplored_region['type_b']

    nodes_a = [n for n, d in G.nodes(data=True) if d.get('type') == type_a]
    nodes_b = [n for n, d in G.nodes(data=True) if d.get('type') == type_b]

    suggestions = []

    for node_a in nodes_a[:20]:  # Limit for performance
        for node_b in nodes_b[:20]:
            if G.has_edge(node_a, node_b):
                continue

            # Calculate connection probability based on shared neighbors
            shared = len(set(G.neighbors(node_a)) & set(G.neighbors(node_b)))
            total_neighbors = len(set(G.neighbors(node_a)) | set(G.neighbors(node_b)))

            if shared > 0:
                prob = shared / total_neighbors
                suggestions.append({
                    'source': node_a,
                    'target': node_b,
                    'shared_neighbors': shared,
                    'connection_probability': round(prob, 3),
                    'rationale': f"Connected through {shared} shared entities"
                })

    return sorted(suggestions, key=lambda x: x['connection_probability'], reverse=True)[:10]
```

## Innovation Scoring

```python
def calculate_innovation_score(opportunity, G):
    """Score innovation potential using multiple factors."""

    factors = {
        'novelty': 0,      # How new/unexplored
        'impact': 0,       # Potential business impact
        'feasibility': 0   # How achievable
    }

    # Novelty: based on current density
    if 'density' in opportunity:
        factors['novelty'] = 1 - opportunity['density']
    elif 'opportunity_score' in opportunity:
        factors['novelty'] = opportunity['opportunity_score']

    # Impact: based on node importance
    if 'source' in opportunity and 'target' in opportunity:
        src_degree = G.degree(opportunity['source'])
        tgt_degree = G.degree(opportunity['target'])
        max_degree = max(d for _, d in G.degree())
        factors['impact'] = (src_degree + tgt_degree) / (2 * max_degree) if max_degree > 0 else 0

    # Feasibility: inverse of distance
    if 'shared_neighbors' in opportunity:
        factors['feasibility'] = min(1, opportunity['shared_neighbors'] / 5)
    else:
        factors['feasibility'] = 0.5

    # Weighted score
    score = 0.4 * factors['novelty'] + 0.35 * factors['impact'] + 0.25 * factors['feasibility']

    return {
        'innovation_score': round(score, 3),
        'factors': {k: round(v, 3) for k, v in factors.items()},
        'confidence': 0.7 if all(v > 0 for v in factors.values()) else 0.5
    }
```

## Interactivity for Low Confidence Opportunities

```python
if opportunity_score['confidence'] < 0.5:
    response = {
        "ambiguity_detected": True,
        "question": f"Uncertain innovation opportunity detected. Validate?",
        "options": [
            {"id": 1, "label": "Provide domain context"},
            {"id": 2, "label": "Adjust scoring weights"},
            {"id": 3, "label": "Skip low-confidence opportunities"},
            {"id": 4, "label": "Flag for manual review"}
        ],
        "opportunity": opportunity,
        "confidence": opportunity_score['confidence']
    }
    user_input = ask_user(response)
```

## Output JSON Format

```json
{
  "skill": "innovation-opportunity-spotting",
  "timestamp": "2024-01-15T10:00:00Z",
  "structural_holes": [
    {
      "node_id": "person:alice",
      "opportunity_score": 0.82,
      "constraint": 0.18,
      "recommendation": "Alice bridges engineering and product - leverage for cross-functional initiatives"
    }
  ],
  "underexplored_regions": [
    {
      "region": "person-document",
      "density": 0.03,
      "opportunity_score": 0.89,
      "suggested_connections": [
        {"source": "person:bob", "target": "doc:architecture", "probability": 0.65}
      ]
    }
  ],
  "weak_ties_to_strengthen": [
    {
      "source": "team:frontend",
      "target": "team:ml",
      "innovation_potential": 0.78,
      "action": "Schedule joint innovation session"
    }
  ],
  "top_opportunities": [
    {
      "type": "cross_domain",
      "description": "Connect ML team expertise with frontend performance optimization",
      "innovation_score": 0.85,
      "confidence": 0.72
    }
  ],
  "confidence": 0.75,
  "summary": {
    "opportunities_found": 12,
    "high_potential": 3,
    "actionable_now": 5
  }
}
```
