---
name: trend-detection
description: Aggregates patterns and forecasts bottlenecks using KG historical traversals. Use when analyzing temporal patterns, forecasting issues, or identifying emerging trends across entities.
---

# Trend Detection

Aggregate patterns from KG with probabilistic forecasting.

## KG Traversal

```python
import networkx as nx
import numpy as np

def get_historical_patterns(entity_type, G, window_days=30):
    """Query KG for historical entity patterns."""
    patterns = []
    for node, data in G.nodes(data=True):
        if data.get('type') == entity_type:
            created = data.get('created_at')
            status_history = data.get('status_history', [])
            patterns.append({'id': node, 'created': created, 'history': status_history})
    return patterns

def detect_trend(time_series, threshold=0.1):
    """Detect trend direction with confidence."""
    if len(time_series) < 5:
        return {'direction': 'insufficient_data', 'confidence': 0}

    x = np.arange(len(time_series))
    slope, _ = np.polyfit(x, time_series, 1)

    return {
        'direction': 'increasing' if slope > threshold else 'decreasing' if slope < -threshold else 'stable',
        'slope': round(slope, 4),
        'confidence': min(0.9, 0.5 + len(time_series) * 0.02)
    }
```

## Bottleneck Forecasting

```python
def forecast_bottleneck(entity_type, G, horizon_days=14):
    """Predict bottlenecks using weighted growth rates."""
    current_count = len([n for n, d in G.nodes(data=True)
                         if d.get('type') == entity_type and d.get('status') != 'done'])
    growth_rate = calculate_growth_rate(entity_type, G)

    forecast = current_count * (1 + growth_rate) ** (horizon_days / 7)
    capacity = get_team_capacity(G)

    bottleneck_prob = min(1.0, max(0, (forecast - capacity) / capacity))

    return {
        'forecast_count': round(forecast),
        'bottleneck_probability': round(bottleneck_prob, 3),
        'confidence': 0.65,
        'horizon_days': horizon_days
    }
```

## Interactivity

When confidence < 0.5, ask for clarification on trend interpretation.

## Output

```json
{
  "skill": "trend-detection",
  "results": [{
    "entity_type": "jira_issue",
    "trend": {"direction": "increasing", "slope": 0.15, "confidence": 0.78},
    "bottleneck_forecast": {"probability": 0.65, "confidence": 0.7}
  }],
  "alerts": [{"type": "bottleneck_warning", "probability": 0.72}]
}
```
