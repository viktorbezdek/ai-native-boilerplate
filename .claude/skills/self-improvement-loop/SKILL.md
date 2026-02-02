---
name: self-improvement-loop
description: Monitors skill usage and KG health metrics to suggest system improvements
version: 2.0.0
trigger:
  - pattern: "improve system"
  - pattern: "analyze performance"
  - pattern: "skill health"
tags:
  - meta
  - kg-enabled
  - optimization
confidence_threshold: 0.6
---

# Self-Improvement Loop Skill

Meta-skill that monitors system performance and suggests improvements.

@import ../trend-detection/SKILL.md

## Skill Usage Analytics

```python
import json
from datetime import datetime, timedelta
from collections import defaultdict

def analyze_skill_usage(log_path='./graph/skill_logs.json', days=30):
    """Analyze skill invocation patterns and success rates."""

    cutoff = datetime.now() - timedelta(days=days)

    try:
        with open(log_path) as f:
            logs = json.load(f)
    except:
        logs = []

    usage = defaultdict(lambda: {
        'invocations': 0,
        'successes': 0,
        'failures': 0,
        'avg_confidence': [],
        'avg_duration_ms': [],
        'user_overrides': 0
    })

    for log in logs:
        if datetime.fromisoformat(log['timestamp']) < cutoff:
            continue

        skill = log['skill']
        usage[skill]['invocations'] += 1

        if log.get('success', True):
            usage[skill]['successes'] += 1
        else:
            usage[skill]['failures'] += 1

        if 'confidence' in log:
            usage[skill]['avg_confidence'].append(log['confidence'])

        if 'duration_ms' in log:
            usage[skill]['avg_duration_ms'].append(log['duration_ms'])

        if log.get('user_override'):
            usage[skill]['user_overrides'] += 1

    # Calculate averages
    results = {}
    for skill, data in usage.items():
        results[skill] = {
            'invocations': data['invocations'],
            'success_rate': data['successes'] / data['invocations'] if data['invocations'] > 0 else 0,
            'avg_confidence': sum(data['avg_confidence']) / len(data['avg_confidence']) if data['avg_confidence'] else 0,
            'avg_duration_ms': sum(data['avg_duration_ms']) / len(data['avg_duration_ms']) if data['avg_duration_ms'] else 0,
            'override_rate': data['user_overrides'] / data['invocations'] if data['invocations'] > 0 else 0
        }

    return results

def identify_underperforming_skills(usage_stats, thresholds=None):
    """Flag skills that need improvement."""

    thresholds = thresholds or {
        'min_success_rate': 0.8,
        'min_confidence': 0.6,
        'max_override_rate': 0.2,
        'max_duration_ms': 5000
    }

    issues = []

    for skill, stats in usage_stats.items():
        skill_issues = []

        if stats['success_rate'] < thresholds['min_success_rate']:
            skill_issues.append({
                'type': 'low_success_rate',
                'value': round(stats['success_rate'], 3),
                'threshold': thresholds['min_success_rate'],
                'severity': 'high'
            })

        if stats['avg_confidence'] < thresholds['min_confidence']:
            skill_issues.append({
                'type': 'low_confidence',
                'value': round(stats['avg_confidence'], 3),
                'threshold': thresholds['min_confidence'],
                'severity': 'medium'
            })

        if stats['override_rate'] > thresholds['max_override_rate']:
            skill_issues.append({
                'type': 'high_override_rate',
                'value': round(stats['override_rate'], 3),
                'threshold': thresholds['max_override_rate'],
                'severity': 'medium'
            })

        if stats['avg_duration_ms'] > thresholds['max_duration_ms']:
            skill_issues.append({
                'type': 'slow_performance',
                'value': round(stats['avg_duration_ms']),
                'threshold': thresholds['max_duration_ms'],
                'severity': 'low'
            })

        if skill_issues:
            issues.append({
                'skill': skill,
                'issues': skill_issues,
                'priority': 'high' if any(i['severity'] == 'high' for i in skill_issues) else 'medium'
            })

    return sorted(issues, key=lambda x: x['priority'] == 'high', reverse=True)
```

## KG Health Metrics

```python
import networkx as nx

def analyze_kg_health(G):
    """Compute KG health metrics."""

    metrics = {}

    # Size metrics
    metrics['node_count'] = G.number_of_nodes()
    metrics['edge_count'] = G.number_of_edges()
    metrics['density'] = nx.density(G)

    # Connectivity
    if G.is_directed():
        metrics['weakly_connected_components'] = nx.number_weakly_connected_components(G)
        metrics['strongly_connected_components'] = nx.number_strongly_connected_components(G)
    else:
        metrics['connected_components'] = nx.number_connected_components(G)

    # Quality indicators
    orphan_nodes = [n for n in G.nodes() if G.degree(n) == 0]
    metrics['orphan_nodes'] = len(orphan_nodes)
    metrics['orphan_rate'] = len(orphan_nodes) / G.number_of_nodes() if G.number_of_nodes() > 0 else 0

    # Staleness
    from datetime import datetime, timedelta
    stale_cutoff = datetime.now() - timedelta(days=30)
    stale_nodes = 0
    for node, data in G.nodes(data=True):
        updated = data.get('updated_at') or data.get('created_at')
        if updated and datetime.fromisoformat(str(updated)) < stale_cutoff:
            stale_nodes += 1
    metrics['stale_node_rate'] = stale_nodes / G.number_of_nodes() if G.number_of_nodes() > 0 else 0

    # Type distribution
    type_counts = defaultdict(int)
    for _, data in G.nodes(data=True):
        type_counts[data.get('type', 'unknown')] += 1
    metrics['type_distribution'] = dict(type_counts)

    # Health score
    health_score = 1.0
    health_score -= metrics['orphan_rate'] * 0.3
    health_score -= metrics['stale_node_rate'] * 0.3
    health_score -= (1 - min(metrics['density'] * 10, 1)) * 0.2
    health_score -= min(metrics.get('weakly_connected_components', 1) - 1, 5) * 0.04

    metrics['health_score'] = round(max(0, health_score), 3)

    return metrics

def suggest_kg_improvements(health_metrics, G):
    """Generate KG improvement suggestions."""

    suggestions = []

    if health_metrics['orphan_rate'] > 0.1:
        suggestions.append({
            'type': 'orphan_cleanup',
            'description': f"Remove or link {int(health_metrics['orphan_rate'] * health_metrics['node_count'])} orphan nodes",
            'impact': 'medium',
            'confidence': 0.9
        })

    if health_metrics['stale_node_rate'] > 0.3:
        suggestions.append({
            'type': 'refresh_stale_data',
            'description': "Re-fetch data for stale nodes via MCP",
            'impact': 'high',
            'confidence': 0.85
        })

    if health_metrics['density'] < 0.01:
        suggestions.append({
            'type': 'increase_connectivity',
            'description': "Run inference-engine to discover missing relationships",
            'impact': 'high',
            'confidence': 0.75
        })

    # Type imbalance
    types = health_metrics['type_distribution']
    if types:
        max_type = max(types.values())
        min_type = min(types.values())
        if max_type > min_type * 10:
            sparse_type = min(types, key=types.get)
            suggestions.append({
                'type': 'balance_types',
                'description': f"Fetch more '{sparse_type}' entities to balance graph",
                'impact': 'medium',
                'confidence': 0.7
            })

    return suggestions
```

## Improvement Recommendations

```python
def generate_improvement_plan(skill_issues, kg_suggestions, usage_stats):
    """Create prioritized improvement plan."""

    plan = {
        'immediate_actions': [],
        'short_term': [],
        'long_term': []
    }

    # Critical skill fixes
    for issue in skill_issues:
        if issue['priority'] == 'high':
            plan['immediate_actions'].append({
                'target': issue['skill'],
                'action': f"Fix {issue['issues'][0]['type']} in {issue['skill']}",
                'expected_improvement': 0.2,
                'confidence': 0.8
            })
        else:
            plan['short_term'].append({
                'target': issue['skill'],
                'action': f"Optimize {issue['skill']}",
                'expected_improvement': 0.1,
                'confidence': 0.7
            })

    # KG improvements
    for suggestion in kg_suggestions:
        if suggestion['impact'] == 'high':
            plan['immediate_actions'].append({
                'target': 'knowledge_graph',
                'action': suggestion['description'],
                'expected_improvement': 0.15,
                'confidence': suggestion['confidence']
            })
        else:
            plan['short_term'].append({
                'target': 'knowledge_graph',
                'action': suggestion['description'],
                'expected_improvement': 0.1,
                'confidence': suggestion['confidence']
            })

    # Usage-based suggestions
    unused_skills = [s for s, stats in usage_stats.items() if stats['invocations'] < 5]
    if unused_skills:
        plan['long_term'].append({
            'target': 'skill_portfolio',
            'action': f"Review or retire unused skills: {unused_skills[:3]}",
            'expected_improvement': 0.05,
            'confidence': 0.6
        })

    return plan
```

## Interactivity for Improvement Decisions

```python
if improvement_confidence < 0.5:
    response = {
        "ambiguity_detected": True,
        "question": "Several improvement options available. Which to prioritize?",
        "options": [
            {"id": 1, "label": "Focus on skill reliability"},
            {"id": 2, "label": "Focus on KG health"},
            {"id": 3, "label": "Focus on performance"},
            {"id": 4, "label": "Auto-select based on metrics"}
        ],
        "current_health": {
            "skill_health": avg_skill_success_rate,
            "kg_health": kg_metrics['health_score']
        },
        "confidence": improvement_confidence
    }
    user_input = ask_user(response)
```

## Output JSON Format

```json
{
  "skill": "self-improvement-loop",
  "timestamp": "2024-01-15T10:00:00Z",
  "skill_analytics": {
    "total_invocations": 1250,
    "overall_success_rate": 0.89,
    "underperforming_skills": [
      {
        "skill": "sentiment-analysis",
        "issues": [{"type": "low_confidence", "value": 0.52}],
        "priority": "medium"
      }
    ]
  },
  "kg_health": {
    "health_score": 0.78,
    "node_count": 2500,
    "edge_count": 8900,
    "orphan_rate": 0.05,
    "stale_node_rate": 0.22
  },
  "improvement_plan": {
    "immediate_actions": [
      {
        "target": "knowledge_graph",
        "action": "Re-fetch data for stale nodes via MCP",
        "expected_improvement": 0.15
      }
    ],
    "short_term": [
      {
        "target": "sentiment-analysis",
        "action": "Optimize sentiment-analysis confidence threshold",
        "expected_improvement": 0.1
      }
    ],
    "long_term": [
      {
        "target": "skill_portfolio",
        "action": "Review unused skills",
        "expected_improvement": 0.05
      }
    ]
  },
  "confidence": 0.82,
  "next_review": "2024-01-22T10:00:00Z"
}
```

## Automated Execution

```yaml
auto_improvements:
  enabled: true
  safe_actions:
    - orphan_cleanup
    - refresh_stale_data
  require_approval:
    - skill_modification
    - threshold_adjustment
  schedule: weekly
```
