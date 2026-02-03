---
name: what-if-analysis
description: Performs hypothetical scenario analysis by computing diffs and recomputing inferred properties. Use for decision support and impact prediction.
version: 2.0.0
trigger:
  - pattern: "what if"
  - pattern: "scenario analysis"
  - pattern: "hypothetical"
tags:
  - kg-enabled
  - simulation
  - decision-support
confidence_threshold: 0.65
---

# What-If Analysis

Hypothetical scenario modeling for decision support.

## Scenario Definition

```python
import networkx as nx
import copy

def create_scenario(G, modifications):
    """Create hypothetical graph scenario."""
    scenario_G = copy.deepcopy(G)

    for mod in modifications:
        if mod['type'] == 'add_node':
            scenario_G.add_node(mod['node_id'], **mod.get('properties', {}))
        elif mod['type'] == 'remove_node':
            scenario_G.remove_node(mod['node_id'])
        elif mod['type'] == 'add_edge':
            scenario_G.add_edge(mod['source'], mod['target'], **mod.get('properties', {}))
        elif mod['type'] == 'modify_property':
            scenario_G.nodes[mod['node_id']][mod['property']] = mod['value']

    return scenario_G
```

## Diff Computation

```python
def compute_diff(original_G, scenario_G):
    """Compute differences between graphs."""
    diff = {
        'added_nodes': list(set(scenario_G.nodes()) - set(original_G.nodes())),
        'removed_nodes': list(set(original_G.nodes()) - set(scenario_G.nodes())),
        'added_edges': list(set(scenario_G.edges()) - set(original_G.edges())),
        'removed_edges': list(set(original_G.edges()) - set(scenario_G.edges())),
        'property_changes': []
    }

    # Check property changes
    for node in set(original_G.nodes()) & set(scenario_G.nodes()):
        orig = original_G.nodes[node]
        scen = scenario_G.nodes[node]
        for key in set(orig.keys()) | set(scen.keys()):
            if orig.get(key) != scen.get(key):
                diff['property_changes'].append({
                    'node': node, 'property': key,
                    'original': orig.get(key), 'scenario': scen.get(key)
                })

    return diff
```

## Recompute Inferred Properties

```python
def recompute_inferred(scenario_G):
    """Recompute inferred metrics on scenario graph."""
    return {
        'total_blockers': count_blockers(scenario_G),
        'critical_path_length': compute_critical_path(scenario_G),
        'team_workload': compute_workload_distribution(scenario_G),
        'predicted_completion': estimate_completion(scenario_G),
        'confidence': 0.7
    }

def compare_scenarios(original_metrics, scenario_metrics):
    """Compare metrics between scenarios."""
    comparison = {}
    for key in original_metrics:
        if isinstance(original_metrics[key], (int, float)):
            comparison[key] = {
                'original': original_metrics[key],
                'scenario': scenario_metrics[key],
                'delta': scenario_metrics[key] - original_metrics[key],
                'delta_pct': (scenario_metrics[key] - original_metrics[key]) / max(original_metrics[key], 1)
            }
    return comparison
```

## Decision Support

```python
def generate_recommendation(comparison, threshold=0.1):
    """Generate recommendation based on scenario impact."""
    positive_impacts = [k for k, v in comparison.items() if v.get('delta_pct', 0) < -threshold]
    negative_impacts = [k for k, v in comparison.items() if v.get('delta_pct', 0) > threshold]

    if len(positive_impacts) > len(negative_impacts):
        return {'recommendation': 'proceed', 'confidence': 0.7, 'reasoning': positive_impacts}
    else:
        return {'recommendation': 'reconsider', 'confidence': 0.6, 'reasoning': negative_impacts}
```

## Interactivity

Ask when impact uncertain: "Apply scenario? Predicted impact: {summary}"

## Output

```json
{
  "skill": "what-if-analysis",
  "scenario": "Remove ENG-100 as blocker",
  "diff": {"removed_edges": [["ENG-100", "ENG-123"]]},
  "comparison": {
    "total_blockers": {"original": 5, "scenario": 4, "delta": -1},
    "predicted_completion": {"original": 14, "scenario": 10, "delta": -4}
  },
  "recommendation": {"action": "proceed", "confidence": 0.75}
}
```
