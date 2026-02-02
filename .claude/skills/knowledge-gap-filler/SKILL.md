---
name: knowledge-gap-filler
description: Detects sparse KG areas and suggests MCP re-queries to self-heal the graph. Use when finding incomplete data or improving graph coverage.
---

# Knowledge Gap Filler

Detect and fill sparse KG regions.

## Gap Detection

```python
import networkx as nx

def detect_sparse_nodes(G, min_edges=2):
    """Find nodes with insufficient connections."""
    sparse = []
    for node, degree in G.degree():
        if degree < min_edges:
            sparse.append({
                'node_id': node,
                'current_edges': degree,
                'type': G.nodes[node].get('type'),
                'gap_severity': 1 - (degree / min_edges)
            })
    return sorted(sparse, key=lambda x: x['gap_severity'], reverse=True)

def detect_missing_relations(G, expected_relations):
    """Find expected but missing relationship types."""
    gaps = []
    for node, data in G.nodes(data=True):
        node_type = data.get('type')
        expected = expected_relations.get(node_type, [])

        existing = set(G.edges[node, n].get('relation_type')
                      for n in G.neighbors(node))

        missing = set(expected) - existing
        if missing:
            gaps.append({
                'node_id': node,
                'missing_relations': list(missing),
                'confidence': 0.7
            })
    return gaps
```

## MCP Re-Query Suggestions

```python
def suggest_mcp_queries(gaps):
    """Generate MCP queries to fill gaps."""
    suggestions = []

    for gap in gaps:
        node_type = gap.get('type')

        if node_type == 'person' and 'assigned_to' in gap.get('missing_relations', []):
            suggestions.append({
                'mcp_server': 'jira',
                'query': f"assignee = '{gap['node_id']}'",
                'expected_fill': 'assigned_to edges',
                'confidence': 0.8
            })

        if node_type == 'issue' and gap.get('current_edges', 0) < 2:
            suggestions.append({
                'mcp_server': 'jira',
                'query': f"issue = '{gap['node_id']}' expand=changelog",
                'expected_fill': 'history and relations',
                'confidence': 0.75
            })

    return suggestions
```

## Self-Healing

```python
def execute_self_heal(suggestions, mcp_client):
    """Execute MCP queries and update graph."""
    results = []
    for suggestion in suggestions:
        if suggestion['confidence'] >= 0.6:
            data = mcp_client.query(suggestion['mcp_server'], suggestion['query'])
            results.append({'suggestion': suggestion, 'data_retrieved': len(data)})
    return results
```

## Interactivity

Ask when confidence uncertain: "Re-query {mcp_server} to fill gaps? (estimated: {count} new edges)"

## Output

```json
{
  "skill": "knowledge-gap-filler",
  "gaps_detected": [{"node_id": "ENG-123", "missing_relations": ["assigned_to"], "confidence": 0.7}],
  "suggestions": [{"mcp_server": "jira", "query": "...", "confidence": 0.8}],
  "healed_count": 12,
  "confidence": 0.75
}
```
