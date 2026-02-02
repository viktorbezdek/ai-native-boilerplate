---
name: echo-chamber-detection
description: Identifies isolated communication clusters and suggests cross-pollination opportunities
version: 2.0.0
trigger:
  - pattern: "detect echo chambers"
  - pattern: "find silos"
  - pattern: "communication gaps"
tags:
  - analysis
  - kg-enabled
  - collaboration
confidence_threshold: 0.7
---

# Echo Chamber Detection Skill

Detects communication silos and suggests cross-team collaboration opportunities.

@import ../graph-visualization/SKILL.md

## Community Detection

```python
import networkx as nx
from networkx.algorithms import community
import numpy as np

def detect_communication_clusters(G, entity_type='person'):
    """Identify clusters using community detection algorithms."""

    # Build communication subgraph
    persons = [n for n, d in G.nodes(data=True) if d.get('type') == entity_type]
    comm_graph = nx.Graph()

    for person in persons:
        comm_graph.add_node(person, **G.nodes[person])

        for neighbor in G.neighbors(person):
            if G.nodes[neighbor].get('type') == entity_type:
                # Direct communication edge
                if comm_graph.has_edge(person, neighbor):
                    comm_graph[person][neighbor]['weight'] += 1
                else:
                    comm_graph.add_edge(person, neighbor, weight=1)
            else:
                # Indirect: both worked on same item
                for co_worker in G.neighbors(neighbor):
                    if co_worker != person and G.nodes[co_worker].get('type') == entity_type:
                        if comm_graph.has_edge(person, co_worker):
                            comm_graph[person][co_worker]['weight'] += 0.5
                        else:
                            comm_graph.add_edge(person, co_worker, weight=0.5)

    # Detect communities using Louvain method
    try:
        communities = community.louvain_communities(comm_graph, weight='weight')
        confidence = 0.85
    except:
        communities = list(community.label_propagation_communities(comm_graph))
        confidence = 0.65

    return {
        'communities': [list(c) for c in communities],
        'graph': comm_graph,
        'confidence': confidence
    }

def calculate_isolation_score(community_members, comm_graph, all_communities):
    """Calculate how isolated a community is from others."""

    internal_edges = 0
    external_edges = 0

    for member in community_members:
        for neighbor in comm_graph.neighbors(member):
            weight = comm_graph[member][neighbor].get('weight', 1)
            if neighbor in community_members:
                internal_edges += weight
            else:
                external_edges += weight

    # Isolation = ratio of internal to total communication
    total = internal_edges + external_edges
    if total == 0:
        return 1.0  # Completely isolated

    isolation = internal_edges / total
    return round(isolation, 3)
```

## Echo Chamber Identification

```python
def identify_echo_chambers(cluster_result, threshold=0.8):
    """Flag clusters with high isolation as potential echo chambers."""

    echo_chambers = []
    healthy_clusters = []

    for idx, members in enumerate(cluster_result['communities']):
        isolation = calculate_isolation_score(
            members,
            cluster_result['graph'],
            cluster_result['communities']
        )

        cluster_info = {
            'cluster_id': idx,
            'members': members,
            'size': len(members),
            'isolation_score': isolation,
            'is_echo_chamber': isolation >= threshold
        }

        if isolation >= threshold:
            echo_chambers.append(cluster_info)
        else:
            healthy_clusters.append(cluster_info)

    return {
        'echo_chambers': echo_chambers,
        'healthy_clusters': healthy_clusters,
        'echo_chamber_count': len(echo_chambers),
        'confidence': cluster_result['confidence']
    }

def find_bridge_candidates(echo_chamber, all_clusters, comm_graph, G):
    """Find people who could bridge between isolated clusters."""

    candidates = []
    chamber_members = set(echo_chamber['members'])

    # Find members with any external connections
    for member in chamber_members:
        external_contacts = []
        for neighbor in comm_graph.neighbors(member):
            if neighbor not in chamber_members:
                external_contacts.append(neighbor)

        if external_contacts:
            candidates.append({
                'person_id': member,
                'name': G.nodes[member].get('name', member),
                'external_contact_count': len(external_contacts),
                'bridge_potential': len(external_contacts) / len(chamber_members)
            })

    # Also find external people who could bridge in
    external_bridges = []
    for cluster in all_clusters:
        if cluster['cluster_id'] == echo_chamber['cluster_id']:
            continue
        for member in cluster['members']:
            connections_to_chamber = len([
                n for n in comm_graph.neighbors(member)
                if n in chamber_members
            ])
            if connections_to_chamber > 0:
                external_bridges.append({
                    'person_id': member,
                    'from_cluster': cluster['cluster_id'],
                    'connections': connections_to_chamber
                })

    return {
        'internal_bridges': sorted(candidates, key=lambda x: x['bridge_potential'], reverse=True),
        'external_bridges': sorted(external_bridges, key=lambda x: x['connections'], reverse=True)
    }
```

## Cross-Pollination Suggestions

```python
def suggest_cross_pollination(echo_chambers, all_clusters, G):
    """Generate actionable suggestions to break echo chambers."""

    suggestions = []

    for chamber in echo_chambers:
        bridges = find_bridge_candidates(chamber, all_clusters, G)

        # Suggest shared meetings
        if bridges['internal_bridges']:
            suggestions.append({
                'type': 'cross_team_meeting',
                'echo_chamber': chamber['cluster_id'],
                'action': f"Include {bridges['internal_bridges'][0]['name']} in cross-team syncs",
                'impact_probability': 0.7,
                'confidence': 0.75
            })

        # Suggest project collaboration
        if bridges['external_bridges']:
            suggestions.append({
                'type': 'project_collaboration',
                'echo_chamber': chamber['cluster_id'],
                'action': f"Pair chamber members with {bridges['external_bridges'][0]['person_id']}",
                'impact_probability': 0.65,
                'confidence': 0.7
            })

        # Suggest communication channel
        if chamber['isolation_score'] > 0.9:
            suggestions.append({
                'type': 'communication_channel',
                'echo_chamber': chamber['cluster_id'],
                'action': "Create shared Slack channel between isolated teams",
                'impact_probability': 0.5,
                'confidence': 0.6
            })

    return suggestions
```

## Interactivity for Ambiguous Clusters

```python
if cluster_result['confidence'] < 0.5 or len(cluster_result['communities']) < 2:
    response = {
        "ambiguity_detected": True,
        "question": "Cluster detection uncertain. How to proceed?",
        "options": [
            {"id": 1, "label": "Use organizational hierarchy instead"},
            {"id": 2, "label": "Adjust detection sensitivity"},
            {"id": 3, "label": "Manually define teams"},
            {"id": 4, "label": "Proceed with low confidence"}
        ],
        "detected_clusters": len(cluster_result['communities']),
        "confidence": cluster_result['confidence']
    }
    user_input = ask_user(response)
```

## Output JSON Format

```json
{
  "skill": "echo-chamber-detection",
  "timestamp": "2024-01-15T10:00:00Z",
  "analysis": {
    "total_clusters": 5,
    "echo_chambers_found": 2,
    "healthy_clusters": 3
  },
  "echo_chambers": [
    {
      "cluster_id": 2,
      "members": ["person:alice", "person:bob", "person:carol"],
      "isolation_score": 0.92,
      "bridge_candidates": [
        {"person": "Alice", "bridge_potential": 0.33}
      ]
    }
  ],
  "suggestions": [
    {
      "type": "cross_team_meeting",
      "action": "Include Alice in cross-team syncs",
      "impact_probability": 0.7,
      "confidence": 0.75
    }
  ],
  "confidence": 0.82,
  "summary": {
    "risk_level": "medium",
    "immediate_actions": 2,
    "long_term_actions": 3
  }
}
```
