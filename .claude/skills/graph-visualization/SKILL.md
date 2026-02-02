---
name: graph-visualization
description: Generates visual representations of KG subgraphs with layout algorithms and export formats
version: 2.0.0
trigger:
  - pattern: "visualize graph"
  - pattern: "show knowledge graph"
  - pattern: "export graph"
tags:
  - visualization
  - kg-enabled
  - reporting
confidence_threshold: 0.7
---

# Graph Visualization Skill

Renders KG subgraphs with configurable layouts and export formats.

@import ../context-query/SKILL.md

## KG Subgraph Extraction

```python
import networkx as nx
from datetime import datetime, timedelta

def extract_subgraph(G, center_node, depth=2, edge_types=None):
    """Extract ego-centric subgraph for visualization."""

    # BFS to specified depth
    visited = {center_node}
    frontier = [center_node]

    for _ in range(depth):
        next_frontier = []
        for node in frontier:
            for neighbor in G.neighbors(node):
                edge_data = G.edges[node, neighbor]
                if edge_types and edge_data.get('relation_type') not in edge_types:
                    continue
                if neighbor not in visited:
                    visited.add(neighbor)
                    next_frontier.append(neighbor)
        frontier = next_frontier

    subgraph = G.subgraph(visited).copy()

    return {
        'nodes': len(subgraph.nodes()),
        'edges': len(subgraph.edges()),
        'graph': subgraph,
        'center': center_node,
        'depth': depth
    }

def calculate_node_importance(G, node):
    """Score node importance for sizing in visualization."""

    degree = G.degree(node)
    in_degree = G.in_degree(node) if G.is_directed() else degree
    out_degree = G.out_degree(node) if G.is_directed() else degree

    # PageRank-like importance
    try:
        pagerank = nx.pagerank(G, max_iter=50).get(node, 0)
    except:
        pagerank = 0

    importance = 0.3 * (degree / max(G.degree(), key=lambda x: x[1])[1]) + \
                 0.7 * pagerank * 100

    return round(min(1.0, importance), 3)
```

## Layout Algorithms

```python
import numpy as np

def compute_layout(G, algorithm='force_directed'):
    """Compute node positions using various algorithms."""

    layouts = {
        'force_directed': nx.spring_layout,
        'circular': nx.circular_layout,
        'hierarchical': nx.kamada_kawai_layout,
        'spectral': nx.spectral_layout,
        'shell': nx.shell_layout
    }

    layout_fn = layouts.get(algorithm, nx.spring_layout)

    try:
        positions = layout_fn(G)
        confidence = 0.9
    except Exception as e:
        # Fallback to random layout
        positions = nx.random_layout(G)
        confidence = 0.4

    # Normalize to 0-1 range
    pos_array = np.array(list(positions.values()))
    min_pos = pos_array.min(axis=0)
    max_pos = pos_array.max(axis=0)
    range_pos = max_pos - min_pos
    range_pos[range_pos == 0] = 1  # Avoid division by zero

    normalized = {
        node: tuple((np.array(pos) - min_pos) / range_pos)
        for node, pos in positions.items()
    }

    return {
        'positions': normalized,
        'algorithm': algorithm,
        'confidence': confidence
    }
```

## Visual Encoding

```python
def encode_visual_properties(G, layout_result):
    """Assign visual properties to nodes and edges."""

    type_colors = {
        'person': '#4CAF50',
        'issue': '#F44336',
        'message': '#2196F3',
        'meeting': '#FF9800',
        'document': '#9C27B0',
        'decision': '#00BCD4'
    }

    edge_colors = {
        'assigned_to': '#666666',
        'mentions': '#999999',
        'blocked_by': '#F44336',
        'depends_on': '#FF9800',
        'collaborates_with': '#4CAF50'
    }

    nodes = []
    for node in G.nodes():
        data = G.nodes[node]
        pos = layout_result['positions'].get(node, (0.5, 0.5))
        importance = calculate_node_importance(G, node)

        nodes.append({
            'id': node,
            'label': data.get('name', node)[:30],
            'x': round(pos[0], 4),
            'y': round(pos[1], 4),
            'size': 10 + importance * 40,
            'color': type_colors.get(data.get('type'), '#888888'),
            'type': data.get('type', 'unknown')
        })

    edges = []
    for u, v, data in G.edges(data=True):
        edges.append({
            'source': u,
            'target': v,
            'label': data.get('relation_type', ''),
            'color': edge_colors.get(data.get('relation_type'), '#CCCCCC'),
            'weight': data.get('weight', 1.0)
        })

    return {'nodes': nodes, 'edges': edges}
```

## Export Formats

```python
import json

def export_graph(visual_data, format='json'):
    """Export visualization to various formats."""

    if format == 'json':
        return json.dumps(visual_data, indent=2)

    elif format == 'dot':
        lines = ['digraph KG {']
        lines.append('  rankdir=LR;')
        for node in visual_data['nodes']:
            lines.append(f'  "{node["id"]}" [label="{node["label"]}" color="{node["color"]}"];')
        for edge in visual_data['edges']:
            lines.append(f'  "{edge["source"]}" -> "{edge["target"]}" [label="{edge["label"]}"];')
        lines.append('}')
        return '\n'.join(lines)

    elif format == 'cytoscape':
        return {
            'elements': {
                'nodes': [{'data': n} for n in visual_data['nodes']],
                'edges': [{'data': e} for e in visual_data['edges']]
            }
        }

    return visual_data
```

## Interactivity for Complex Graphs

```python
if len(subgraph.nodes()) > 100:
    response = {
        "ambiguity_detected": True,
        "question": f"Graph has {len(subgraph.nodes())} nodes. How to proceed?",
        "options": [
            {"id": 1, "label": "Show top 50 by importance"},
            {"id": 2, "label": "Cluster and show representatives"},
            {"id": 3, "label": "Filter by entity type"},
            {"id": 4, "label": "Export full graph to file"}
        ],
        "node_count": len(subgraph.nodes()),
        "confidence": 0.4
    }
    user_input = ask_user(response)
```

## Output JSON Format

```json
{
  "skill": "graph-visualization",
  "timestamp": "2024-01-15T10:00:00Z",
  "visualization": {
    "nodes": [
      {"id": "person:alice", "label": "Alice", "x": 0.5, "y": 0.3, "size": 35, "color": "#4CAF50", "type": "person"}
    ],
    "edges": [
      {"source": "person:alice", "target": "issue:123", "label": "assigned_to", "color": "#666666"}
    ],
    "layout_algorithm": "force_directed",
    "center_node": "person:alice",
    "depth": 2
  },
  "statistics": {
    "total_nodes": 45,
    "total_edges": 78,
    "node_types": {"person": 10, "issue": 25, "message": 10},
    "avg_degree": 3.47
  },
  "exports_available": ["json", "dot", "cytoscape"],
  "confidence": 0.85
}
```
