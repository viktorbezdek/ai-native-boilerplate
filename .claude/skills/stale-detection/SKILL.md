---
name: stale-detection
description: Detects inactive items and infers decay risk probability
version: 2.0.0
trigger:
  - pattern: "detect stale"
  - pattern: "find inactive"
  - pattern: "decay risk"
tags:
  - analysis
  - core
  - kg-enabled
confidence_threshold: 0.7
---

# Stale Detection Skill

Deep analysis for detecting inactive items with probabilistic decay risk inference.

@import ../graph-update/SKILL.md
@import ../analyze-stale/SKILL.md

## Knowledge Graph Integration

### Load Graph

```python
import networkx as nx
import json

# Load KG from filesystem
with open('./graph/main_graph.json', 'r') as f:
    data = json.load(f)
G = nx.node_link_graph(data)
```

### Cross-Source Activity Query

```python
def check_cross_source_activity(entity_id, days=7):
    """Query KG for activity across all sources."""
    neighbors = list(G.neighbors(entity_id))
    activities = []

    for n in neighbors:
        edge_data = G.edges[entity_id, n]
        if edge_data.get('last_activity'):
            activities.append({
                'source': edge_data.get('source'),
                'timestamp': edge_data.get('last_activity'),
                'type': edge_data.get('relation_type')
            })

    return activities
```

## Probability Inference

### Decay Risk Calculation

```python
import sympy as sp
from sympy.stats import P, E, Bernoulli

def calculate_decay_probability(item, kg_context):
    """Bayesian inference for decay risk."""

    # Prior: base rate from historical data
    prior_decay = 0.3

    # Evidence factors
    days_inactive = item['days_since_update']
    has_blockers = len(kg_context.get('blockers', [])) > 0
    cross_activity = len(kg_context.get('cross_source_activity', []))

    # Likelihood adjustments
    if days_inactive > 14:
        likelihood_inactive = 0.9
    elif days_inactive > 7:
        likelihood_inactive = 0.6
    else:
        likelihood_inactive = 0.2

    blocker_factor = 1.3 if has_blockers else 1.0
    activity_factor = max(0.5, 1.0 - (cross_activity * 0.1))

    # Posterior probability
    posterior = prior_decay * likelihood_inactive * blocker_factor * activity_factor
    confidence = min(1.0, posterior)

    return {
        'decay_probability': round(confidence, 3),
        'factors': {
            'days_inactive': days_inactive,
            'has_blockers': has_blockers,
            'cross_source_activity': cross_activity
        }
    }
```

## Thresholds

```yaml
thresholds:
  critical:
    days: 14
    decay_prob: 0.8
  warning:
    days: 7
    decay_prob: 0.5
  watch:
    days: 3
    decay_prob: 0.3
```

## Interactivity for Low Confidence

When confidence < 0.5, ask user for clarification:

```python
if result['confidence'] < 0.5:
    # Trigger interactive prompt
    response = {
        "ambiguity_detected": True,
        "question": f"Item {item_id} shows mixed signals. Is this intentionally paused?",
        "options": [
            {"id": 1, "label": "Yes, intentionally paused"},
            {"id": 2, "label": "No, needs attention"},
            {"id": 3, "label": "Unsure, investigate further"}
        ],
        "default": 2
    }
    # Spawn human-in-loop subagent
    spawn_subagent('human-in-loop', response)
```

## Output JSON Format

```json
{
  "skill": "stale-detection",
  "timestamp": "2024-01-15T10:00:00Z",
  "results": [
    {
      "entity_id": "ENG-123",
      "entity_type": "jira_issue",
      "days_inactive": 12,
      "decay_probability": 0.78,
      "confidence": 0.85,
      "severity": "critical",
      "kg_context": {
        "blockers": ["ENG-100"],
        "cross_source_activity": [],
        "related_entities": 5
      },
      "suggested_action": "Escalate to assignee"
    }
  ],
  "summary": {
    "total_scanned": 150,
    "stale_found": 12,
    "critical": 3,
    "warning": 5,
    "watch": 4
  }
}
```

## Subagent Integration

For parallel processing of large datasets:

```yaml
parallel_batch:
  - subagent: stale-worker-1
    entities: jira_issues[0:50]
  - subagent: stale-worker-2
    entities: jira_issues[50:100]
  - subagent: stale-worker-3
    entities: asana_tasks[0:50]
```
