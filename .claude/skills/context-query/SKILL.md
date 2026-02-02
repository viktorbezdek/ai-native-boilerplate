---
name: context-query
description: Traverses KG for related nodes/edges using shortest path and influence chain inference. Use when gathering context about an entity, finding relationships, or understanding impact chains.
---

# Context Query

KG traversal for context gathering with confidence-weighted influence chains.

## Graph Traversal

```python
import networkx as nx

def query_context(entity_id, G, max_depth=3, relation_types=None):
    """BFS traversal to gather related context from KG."""
    context = {'nodes': [], 'edges': [], 'paths': []}

    # Get direct neighbors
    for neighbor in G.neighbors(entity_id):
        edge_data = G.edges[entity_id, neighbor]
        if relation_types is None or edge_data.get('relation_type') in relation_types:
            context['nodes'].append({
                'id': neighbor,
                'data': G.nodes[neighbor],
                'distance': 1
            })
            context['edges'].append({
                'source': entity_id,
                'target': neighbor,
                'relation': edge_data.get('relation_type')
            })

    return context

def find_shortest_path(source, target, G):
    """Find shortest path with path confidence."""
    try:
        path = nx.shortest_path(G, source, target)
        return {'path': path, 'length': len(path) - 1, 'confidence': 0.9 ** (len(path) - 1)}
    except nx.NetworkXNoPath:
        return {'path': None, 'confidence': 0}
```

## Influence Chain Inference

```python
def infer_influence_chain(entity_id, G, direction='outgoing'):
    """Infer influence chains with probability weighting."""
    chains = []
    visited = set()

    def traverse(node, chain, prob):
        if node in visited or prob < 0.1:
            return
        visited.add(node)

        neighbors = G.successors(node) if direction == 'outgoing' else G.predecessors(node)
        for n in neighbors:
            edge = G.edges[node, n] if direction == 'outgoing' else G.edges[n, node]
            edge_weight = edge.get('weight', 0.8)
            new_prob = prob * edge_weight

            new_chain = chain + [{'node': n, 'prob': round(new_prob, 3)}]
            chains.append(new_chain)
            traverse(n, new_chain, new_prob)

    traverse(entity_id, [], 1.0)
    return chains
```

## Interactivity

When multiple paths exist with similar confidence, ask user to choose focus.

## Output

```json
{
  "skill": "context-query",
  "entity_id": "ENG-123",
  "context": {
    "direct_relations": 8,
    "influence_chains": [
      {"path": ["ENG-123", "ENG-100", "project:alpha"], "confidence": 0.72}
    ]
  },
  "confidence": 0.85
}
```
