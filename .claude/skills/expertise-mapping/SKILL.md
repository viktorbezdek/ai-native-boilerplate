---
name: expertise-mapping
description: Maps person-to-skill relationships from KG activity patterns and contribution history
version: 2.0.0
trigger:
  - pattern: "map expertise"
  - pattern: "find expert"
  - pattern: "who knows"
tags:
  - analysis
  - kg-enabled
  - people
confidence_threshold: 0.65
---

# Expertise Mapping Skill

Infers expertise from KG activity patterns and builds person-skill edges.

@import ../context-query/SKILL.md
@import ../inference-engine/SKILL.md

## KG Activity Analysis

```python
import networkx as nx
from collections import defaultdict
from datetime import datetime, timedelta

def analyze_activity_patterns(person_id, G, days=180):
    """Extract activity patterns to infer expertise areas."""

    cutoff = datetime.now() - timedelta(days=days)
    activity = defaultdict(lambda: {'count': 0, 'recent': 0, 'items': []})

    for neighbor in G.neighbors(person_id):
        edge = G.edges[person_id, neighbor]
        node_data = G.nodes[neighbor]

        # Categorize by activity type
        relation = edge.get('relation_type', '')
        node_type = node_data.get('type', '')

        # Extract topic/domain tags
        tags = node_data.get('tags', [])
        labels = node_data.get('labels', [])
        component = node_data.get('component', '')

        domains = set(tags + labels)
        if component:
            domains.add(component)

        for domain in domains:
            activity[domain]['count'] += 1
            activity[domain]['items'].append(neighbor)

            # Check recency
            ts = edge.get('timestamp') or node_data.get('created_at')
            if ts and ts > cutoff:
                activity[domain]['recent'] += 1

    return dict(activity)

def calculate_expertise_score(activity_data, domain):
    """Probabilistic expertise scoring."""

    data = activity_data.get(domain, {'count': 0, 'recent': 0})

    # Volume factor (log scale)
    import math
    volume_score = min(1.0, math.log10(data['count'] + 1) / 2)

    # Recency factor
    recency_score = data['recent'] / max(data['count'], 1)

    # Combined score
    expertise_prob = 0.6 * volume_score + 0.4 * recency_score

    # Confidence based on data quantity
    confidence = min(1.0, data['count'] / 20)

    return {
        'domain': domain,
        'expertise_probability': round(expertise_prob, 3),
        'confidence': round(confidence, 3),
        'activity_count': data['count'],
        'recent_activity': data['recent']
    }
```

## Expert Discovery

```python
def find_experts_for_domain(domain, G, min_confidence=0.5):
    """Find all experts for a given domain."""

    experts = []
    persons = [n for n, d in G.nodes(data=True) if d.get('type') == 'person']

    for person in persons:
        activity = analyze_activity_patterns(person, G)
        score = calculate_expertise_score(activity, domain)

        if score['expertise_probability'] > 0.3 and score['confidence'] >= min_confidence:
            experts.append({
                'person_id': person,
                'name': G.nodes[person].get('name', person),
                **score
            })

    return sorted(experts, key=lambda x: x['expertise_probability'], reverse=True)

def build_expertise_edges(person_id, activity_data, G, threshold=0.5):
    """Create KG edges for inferred expertise."""

    new_edges = []

    for domain, data in activity_data.items():
        score = calculate_expertise_score(activity_data, domain)

        if score['expertise_probability'] >= threshold and score['confidence'] >= 0.5:
            # Create skill node if doesn't exist
            skill_node = f"skill:{domain}"
            if not G.has_node(skill_node):
                G.add_node(skill_node, type='skill', name=domain)

            # Add expertise edge
            G.add_edge(person_id, skill_node,
                       relation_type='has_expertise',
                       expertise_probability=score['expertise_probability'],
                       confidence=score['confidence'],
                       inferred_at=datetime.now().isoformat(),
                       evidence_count=score['activity_count'])

            new_edges.append({
                'from': person_id,
                'to': skill_node,
                'probability': score['expertise_probability']
            })

    return new_edges
```

## Team Expertise Coverage

```python
def analyze_team_coverage(team_members, required_skills, G):
    """Analyze if team has required expertise coverage."""

    coverage = {}
    gaps = []

    for skill in required_skills:
        experts = find_experts_for_domain(skill, G)
        team_experts = [e for e in experts if e['person_id'] in team_members]

        if team_experts:
            coverage[skill] = {
                'covered': True,
                'experts': team_experts[:3],
                'max_probability': max(e['expertise_probability'] for e in team_experts),
                'confidence': max(e['confidence'] for e in team_experts)
            }
        else:
            gaps.append({
                'skill': skill,
                'nearest_experts': experts[:3],
                'gap_severity': 'high' if skill in ['critical', 'security'] else 'medium'
            })
            coverage[skill] = {'covered': False, 'experts': []}

    return {
        'coverage': coverage,
        'gaps': gaps,
        'coverage_ratio': len([c for c in coverage.values() if c['covered']]) / len(required_skills)
    }
```

## Interactivity for Uncertain Expertise

```python
if expertise_score['confidence'] < 0.5:
    response = {
        "ambiguity_detected": True,
        "question": f"Low confidence for {person_id}'s expertise in {domain}. Additional info?",
        "options": [
            {"id": 1, "label": "Confirm expertise (manual override)"},
            {"id": 2, "label": "Add training/certification data"},
            {"id": 3, "label": "Skip this domain"},
            {"id": 4, "label": "Suggest alternative expert"}
        ],
        "current_score": expertise_score,
        "activity_samples": activity_data.get(domain, {}).get('items', [])[:5]
    }
    user_input = ask_user(response)
```

## Output JSON Format

```json
{
  "skill": "expertise-mapping",
  "timestamp": "2024-01-15T10:00:00Z",
  "person_expertise": [
    {
      "person_id": "person:alice@example.com",
      "name": "Alice",
      "expertise_areas": [
        {"domain": "react", "probability": 0.89, "confidence": 0.92, "activity_count": 45},
        {"domain": "typescript", "probability": 0.75, "confidence": 0.85, "activity_count": 32}
      ],
      "edges_created": 2
    }
  ],
  "domain_experts": {
    "react": [
      {"person": "Alice", "probability": 0.89},
      {"person": "Bob", "probability": 0.72}
    ]
  },
  "team_coverage": {
    "coverage_ratio": 0.85,
    "gaps": ["kubernetes", "ml-ops"],
    "recommendations": ["Consider training or hiring for kubernetes expertise"]
  },
  "confidence": 0.78,
  "nodes_created": 15,
  "edges_created": 42
}
```
