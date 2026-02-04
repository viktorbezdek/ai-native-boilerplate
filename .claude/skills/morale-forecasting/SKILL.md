---
name: morale-forecasting
description: Time-series prediction of morale drops with intervention suggestions
version: 2.0.0
trigger:
  - pattern: "forecast morale"
  - pattern: "predict mood"
  - pattern: "team health"
tags:
  - analysis
  - sentiment
  - forecasting
  - kg-enabled
confidence_threshold: 0.65
---

# Morale Forecasting Skill

Time-series prediction of morale with KG-enhanced intervention recommendations.

@import ../sentiment-analysis/SKILL.md
@import ../graph-update/SKILL.md

## Knowledge Graph Integration

### Sentiment Time Series Query

```python
import networkx as nx
import numpy as np
from datetime import datetime, timedelta

def get_sentiment_time_series(entity_id, G, days=90):
    """Extract sentiment time series from KG edges."""

    series = []
    cutoff = datetime.now() - timedelta(days=days)

    for u, v, d in G.edges(entity_id, data=True):
        if d.get('relation_type') == 'has_sentiment':
            ts = datetime.fromisoformat(d.get('timestamp'))
            if ts > cutoff:
                series.append({
                    'date': ts,
                    'score': d.get('sentiment_score'),
                    'confidence': d.get('confidence')
                })

    return sorted(series, key=lambda x: x['date'])

def query_influencing_factors(entity_id, G):
    """Query KG for factors that may influence morale."""

    factors = {
        'workload': [],
        'blockers': [],
        'achievements': [],
        'conflicts': []
    }

    # Workload: count assigned issues/tasks
    assigned = [n for n in G.neighbors(entity_id)
                if G.edges[entity_id, n].get('relation_type') == 'assigned_to']
    factors['workload'] = len(assigned)

    # Blockers
    blockers = [n for n in G.neighbors(entity_id)
                if G.edges[entity_id, n].get('relation_type') == 'blocked_by']
    factors['blockers'] = len(blockers)

    # Recent achievements (completed items)
    completed = [n for n in G.neighbors(entity_id)
                 if G.nodes[n].get('status') == 'completed'
                 and is_recent(G.nodes[n].get('completed_at'), days=14)]
    factors['achievements'] = len(completed)

    return factors
```

## Time Series Forecasting

```python
import numpy as np
from scipy import stats

def forecast_morale(time_series, horizon_days=14):
    """Forecast morale using weighted moving average + trend."""

    if len(time_series) < 7:
        return {
            'forecast': None,
            'confidence': 0.0,
            'reason': 'insufficient_data'
        }

    scores = np.array([p['score'] for p in time_series])
    dates = [p['date'] for p in time_series]

    # Weighted moving average (recent data weighted more)
    weights = np.exp(np.linspace(-1, 0, len(scores)))
    weighted_avg = np.average(scores, weights=weights)

    # Linear trend
    x = np.arange(len(scores))
    slope, intercept, r_value, p_value, std_err = stats.linregress(x, scores)

    # Forecast
    forecast_point = intercept + slope * (len(scores) + horizon_days)
    forecast_point = max(-1, min(1, forecast_point))  # Clamp to valid range

    # Confidence based on R² and data quantity
    confidence = (r_value ** 2) * min(1.0, len(scores) / 30)

    return {
        'current_morale': round(weighted_avg, 3),
        'forecast_morale': round(forecast_point, 3),
        'trend': 'declining' if slope < -0.01 else 'improving' if slope > 0.01 else 'stable',
        'trend_slope': round(slope, 4),
        'confidence': round(confidence, 3),
        'horizon_days': horizon_days
    }
```

## Drop Probability Inference

```python
import sympy as sp
from sympy.stats import Normal, P

def calculate_drop_probability(forecast, influencing_factors):
    """Bayesian inference for morale drop probability."""

    # Base drop probability from forecast
    if forecast['trend'] == 'declining':
        base_prob = 0.6 + abs(forecast['trend_slope']) * 10
    elif forecast['trend'] == 'stable':
        base_prob = 0.3
    else:
        base_prob = 0.1

    # Factor adjustments
    workload_factor = min(1.5, 1 + influencing_factors['workload'] * 0.05)
    blocker_factor = 1 + influencing_factors['blockers'] * 0.15
    achievement_factor = max(0.5, 1 - influencing_factors['achievements'] * 0.1)

    # Combined probability
    drop_prob = min(1.0, base_prob * workload_factor * blocker_factor * achievement_factor)

    return {
        'drop_probability': round(drop_prob, 3),
        'risk_level': 'high' if drop_prob > 0.7 else 'medium' if drop_prob > 0.4 else 'low',
        'contributing_factors': {
            'trend': forecast['trend'],
            'workload': influencing_factors['workload'],
            'blockers': influencing_factors['blockers'],
            'recent_achievements': influencing_factors['achievements']
        }
    }
```

## Intervention Suggestions

```python
def suggest_interventions(entity_id, drop_analysis, kg_context):
    """Generate intervention recommendations based on KG analysis."""

    interventions = []

    # Workload intervention
    if drop_analysis['contributing_factors']['workload'] > 10:
        interventions.append({
            'type': 'workload_redistribution',
            'priority': 'high',
            'suggestion': 'Consider reassigning some tasks',
            'impact_estimate': 0.3,
            'confidence': 0.75
        })

    # Blocker intervention
    if drop_analysis['contributing_factors']['blockers'] > 2:
        blockers = kg_context.get('blocker_details', [])
        interventions.append({
            'type': 'blocker_resolution',
            'priority': 'high',
            'suggestion': f'Prioritize unblocking: {blockers[:3]}',
            'impact_estimate': 0.4,
            'confidence': 0.8
        })

    # Recognition intervention
    if drop_analysis['contributing_factors']['recent_achievements'] == 0:
        interventions.append({
            'type': 'recognition',
            'priority': 'medium',
            'suggestion': 'Acknowledge recent contributions',
            'impact_estimate': 0.2,
            'confidence': 0.6
        })

    # 1:1 meeting suggestion for high risk
    if drop_analysis['drop_probability'] > 0.7:
        interventions.append({
            'type': 'direct_conversation',
            'priority': 'high',
            'suggestion': 'Schedule 1:1 check-in',
            'impact_estimate': 0.35,
            'confidence': 0.7
        })

    return sorted(interventions, key=lambda x: x['priority'] == 'high', reverse=True)
```

## Interactivity for Low Confidence Forecasts

```python
if forecast['confidence'] < 0.5:
    response = {
        "ambiguity_detected": True,
        "question": f"Morale forecast uncertain for {entity_id}. Additional context needed.",
        "options": [
            {"id": 1, "label": "Known issues affecting this person/team"},
            {"id": 2, "label": "Recent positive events not captured"},
            {"id": 3, "label": "Use forecast with low confidence"},
            {"id": 4, "label": "Skip this entity"}
        ],
        "current_data": {
            "data_points": len(time_series),
            "forecast": forecast['forecast_morale'],
            "confidence": forecast['confidence']
        }
    }
    user_input = ask_user(response)

    if user_input == 1:
        # Expand context via KG query
        additional_context = query_additional_factors(entity_id, G)
```

## Output JSON Format

```json
{
  "skill": "morale-forecasting",
  "timestamp": "2024-01-15T10:00:00Z",
  "results": [
    {
      "entity_id": "person:alice@example.com",
      "entity_type": "person",
      "current_morale": 0.45,
      "forecast_morale": 0.28,
      "trend": "declining",
      "drop_probability": 0.72,
      "confidence": 0.78,
      "risk_level": "high",
      "contributing_factors": {
        "workload": 15,
        "blockers": 3,
        "recent_achievements": 1
      },
      "interventions": [
        {
          "type": "blocker_resolution",
          "priority": "high",
          "suggestion": "Prioritize unblocking: ENG-100, ENG-105",
          "impact_estimate": 0.4
        }
      ]
    }
  ],
  "summary": {
    "entities_analyzed": 25,
    "high_risk": 3,
    "medium_risk": 8,
    "low_risk": 14,
    "interventions_suggested": 12
  },
  "alerts": [
    {
      "entity": "person:alice@example.com",
      "alert_type": "morale_drop_predicted",
      "probability": 0.72,
      "confidence": 0.78,
      "action_required": true
    }
  ]
}
```

## Subagent Parallelism

```yaml
parallel_forecast:
  - subagent: time-series-extractor
    entities: all_persons
  - subagent: factor-analyzer
    entities: high_risk_persons
  - subagent: intervention-generator
    entities: entities_needing_intervention
```
