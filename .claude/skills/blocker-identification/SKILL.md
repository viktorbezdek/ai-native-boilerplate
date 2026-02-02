---
name: blocker-identification
description: Infers blocking relationships and cascade risks from KG
version: 2.0.0
trigger:
  - pattern: "find blockers"
  - pattern: "identify blocks"
  - pattern: "cascade analysis"
tags:
  - analysis
  - relationship
  - kg-enabled
confidence_threshold: 0.7
---

# Blocker Identification Skill

Deep analysis for inferring blocking edges and probability-weighted cascade risks.

@import ../graph-update/SKILL.md

## Knowledge Graph Integration

### Explicit Blocker Query

```python
import networkx as nx

def get_explicit_blockers(entity_id, G):
    """Query KG for explicit 'blocks' edges."""

    blockers = []
    for u, v, d in G.in_edges(entity_id, data=True):
        if d.get('relation_type') in ['blocks', 'blocked_by', 'depends_on']:
            blockers.append({
                'blocker_id': u,
                'relation': d.get('relation_type'),
                'explicit': True,
                'confidence': 1.0
            })

    return blockers
```

### Inferred Blocker Detection

```python
def infer_blockers(entity_id, G):
    """Infer implicit blocking relationships from KG patterns."""

    inferred = []

    # Pattern 1: Same assignee, earlier due date, incomplete
    entity = G.nodes[entity_id]
    assignee = entity.get('assignee')
    due_date = entity.get('due_date')

    if assignee:
        assignee_tasks = [n for n in G.neighbors(f"person:{assignee}")
                         if G.nodes[n].get('status') != 'completed']

        for task in assignee_tasks:
            task_due = G.nodes[task].get('due_date')
            if task_due and task_due < due_date:
                inferred.append({
                    'blocker_id': task,
                    'relation': 'inferred_resource_conflict',
                    'explicit': False,
                    'confidence': 0.65,
                    'reason': 'Same assignee, earlier deadline'
                })

    # Pattern 2: Semantic dependency (mentions in description)
    description = entity.get('description', '')
    mentioned_entities = extract_entity_references(description)
    for mentioned in mentioned_entities:
        if G.nodes.get(mentioned, {}).get('status') != 'completed':
            inferred.append({
                'blocker_id': mentioned,
                'relation': 'inferred_semantic_dependency',
                'explicit': False,
                'confidence': 0.55,
                'reason': 'Mentioned in description'
            })

    return inferred
```

### Cascade Chain Analysis

```python
def analyze_cascade_chain(blocker_id, G, max_depth=5):
    """BFS traversal to find cascade impact."""

    visited = set()
    cascade = []
    queue = [(blocker_id, 0)]

    while queue:
        current, depth = queue.pop(0)
        if current in visited or depth > max_depth:
            continue

        visited.add(current)

        # Find all blocked entities
        blocked = [v for u, v, d in G.out_edges(current, data=True)
                   if d.get('relation_type') in ['blocks', 'blocked_by']]

        for b in blocked:
            cascade.append({
                'entity_id': b,
                'depth': depth + 1,
                'blocked_by': current
            })
            queue.append((b, depth + 1))

    return cascade
```

## Probability-Weighted Cascade Risk

```python
import numpy as np

def calculate_cascade_probability(cascade_chain, G):
    """Monte Carlo simulation for cascade impact."""

    if not cascade_chain:
        return {'cascade_probability': 0, 'expected_impact': 0, 'confidence': 1.0}

    # Simulate N scenarios
    N = 1000
    impacts = []

    for _ in range(N):
        impact = 0
        for node in cascade_chain:
            # Probability node gets blocked
            depth_factor = 0.9 ** node['depth']  # Decay with depth
            blocker_status = G.nodes.get(node['blocked_by'], {}).get('status')
            status_factor = 0.8 if blocker_status != 'completed' else 0.2

            if np.random.random() < depth_factor * status_factor:
                impact += G.nodes.get(node['entity_id'], {}).get('story_points', 1)

        impacts.append(impact)

    return {
        'cascade_probability': np.mean([1 if i > 0 else 0 for i in impacts]),
        'expected_impact': np.mean(impacts),
        'worst_case_impact': np.max(impacts),
        'confidence': 0.75,  # Monte Carlo inherent uncertainty
        'simulations': N
    }
```

## Interactivity for Uncertain Blockers

```python
if blocker['confidence'] < 0.5:
    response = {
        "ambiguity_detected": True,
        "question": f"Uncertain if {blocker['blocker_id']} blocks {entity_id}",
        "options": [
            {"id": 1, "label": "Yes, confirmed blocker"},
            {"id": 2, "label": "No, not blocking"},
            {"id": 3, "label": "Partial dependency"},
            {"id": 4, "label": "Investigate further"}
        ],
        "inferred_reason": blocker.get('reason')
    }
    ask_user(response)
```

## Output JSON Format

```json
{
  "skill": "blocker-identification",
  "timestamp": "2024-01-15T10:00:00Z",
  "results": [
    {
      "entity_id": "ENG-123",
      "blockers": [
        {
          "blocker_id": "ENG-100",
          "relation": "blocks",
          "explicit": true,
          "confidence": 1.0
        },
        {
          "blocker_id": "ENG-105",
          "relation": "inferred_resource_conflict",
          "explicit": false,
          "confidence": 0.65,
          "reason": "Same assignee, earlier deadline"
        }
      ],
      "cascade_analysis": {
        "chain_length": 4,
        "cascade_probability": 0.72,
        "expected_impact": 15,
        "worst_case_impact": 28
      }
    }
  ],
  "summary": {
    "entities_analyzed": 50,
    "with_blockers": 18,
    "total_blockers_found": 32,
    "inferred_blockers": 14,
    "high_cascade_risk": 5
  }
}
```

## Subagent Parallelism

```yaml
parallel_analysis:
  - subagent: explicit-blocker-finder
    entities: all_issues
  - subagent: inference-engine
    entities: issues_without_explicit_blockers
  - subagent: cascade-simulator
    entities: entities_with_blockers
```
