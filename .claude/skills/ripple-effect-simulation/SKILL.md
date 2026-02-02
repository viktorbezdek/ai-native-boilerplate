---
name: ripple-effect-simulation
description: Propagates changes through KG using BFS and Monte Carlo simulation. Use when modeling impact of changes or predicting cascade effects.
---

# Ripple Effect Simulation

Model change propagation with probabilistic simulation.

## BFS Propagation

```python
import networkx as nx
from collections import deque

def propagate_change(start_node, change_type, G):
    """BFS to find affected nodes."""
    affected = []
    visited = set()
    queue = deque([(start_node, 0, 1.0)])  # (node, depth, probability)

    while queue:
        node, depth, prob = queue.popleft()
        if node in visited or prob < 0.1:
            continue

        visited.add(node)
        affected.append({'node': node, 'depth': depth, 'probability': round(prob, 3)})

        # Propagate to neighbors
        for neighbor in G.successors(node):
            edge = G.edges[node, neighbor]
            # Probability decay based on edge type
            edge_prob = edge.get('strength', 0.8)
            new_prob = prob * edge_prob * 0.9  # 10% decay per hop

            queue.append((neighbor, depth + 1, new_prob))

    return affected
```

## Monte Carlo Simulation

```python
import numpy as np

def simulate_impact(start_node, G, n_simulations=1000):
    """Monte Carlo simulation for impact modeling."""
    impacts = []

    for _ in range(n_simulations):
        affected_count = 0
        total_impact = 0

        for node in G.nodes():
            # Probability of being affected based on graph distance
            try:
                path_length = nx.shortest_path_length(G, start_node, node)
                affect_prob = 0.9 ** path_length
            except nx.NetworkXNoPath:
                affect_prob = 0

            if np.random.random() < affect_prob:
                affected_count += 1
                total_impact += G.nodes[node].get('weight', 1)

        impacts.append({'affected': affected_count, 'impact': total_impact})

    return {
        'mean_affected': np.mean([i['affected'] for i in impacts]),
        'mean_impact': np.mean([i['impact'] for i in impacts]),
        'worst_case_affected': np.max([i['affected'] for i in impacts]),
        'confidence': 0.75,
        'simulations': n_simulations
    }
```

## Impact Probability Matrix

```python
def build_impact_matrix(changes, G):
    """Build probability matrix for multiple changes."""
    matrix = {}
    for change in changes:
        affected = propagate_change(change['node'], change['type'], G)
        matrix[change['node']] = {a['node']: a['probability'] for a in affected}
    return matrix
```

## Interactivity

Ask when impact uncertain: "Simulate ripple for {node}? (estimated affected: ~{count})"

## Output

```json
{
  "skill": "ripple-effect-simulation",
  "change_source": "ENG-100",
  "propagation": [{"node": "ENG-101", "depth": 1, "probability": 0.72}],
  "simulation": {
    "mean_affected": 8.5,
    "worst_case": 15,
    "mean_impact": 23.2,
    "confidence": 0.75
  }
}
```
