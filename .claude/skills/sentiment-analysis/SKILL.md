---
name: sentiment-analysis
description: Extracts sentiment from messages and aggregates to entities
version: 2.0.0
trigger:
  - pattern: "analyze sentiment"
  - pattern: "mood analysis"
  - pattern: "emotional tone"
tags:
  - analysis
  - sentiment
  - kg-enabled
  - nlp
confidence_threshold: 0.6
---

# Sentiment Analysis Skill

Deep NLP-based sentiment extraction with KG aggregation.

@import ../graph-update/SKILL.md

## Knowledge Graph Integration

### Sentiment Edge Creation

```python
import networkx as nx

def add_sentiment_edge(G, source_id, target_id, sentiment_data):
    """Add sentiment edge to KG."""

    G.add_edge(source_id, target_id,
        relation_type='has_sentiment',
        sentiment_score=sentiment_data['score'],
        sentiment_label=sentiment_data['label'],
        confidence=sentiment_data['confidence'],
        timestamp=sentiment_data['timestamp']
    )

def aggregate_entity_sentiment(G, entity_id, time_window_days=30):
    """Aggregate sentiment scores for an entity from KG."""

    sentiment_edges = [
        d for u, v, d in G.edges(entity_id, data=True)
        if d.get('relation_type') == 'has_sentiment'
        and is_within_window(d.get('timestamp'), time_window_days)
    ]

    if not sentiment_edges:
        return {'aggregate_sentiment': 0.5, 'confidence': 0.0, 'sample_size': 0}

    scores = [e['sentiment_score'] for e in sentiment_edges]
    confs = [e['confidence'] for e in sentiment_edges]

    return {
        'aggregate_sentiment': sum(scores) / len(scores),
        'sentiment_trend': calculate_trend(sentiment_edges),
        'confidence': sum(confs) / len(confs),
        'sample_size': len(scores)
    }
```

### KG Trend Context

```python
def get_sentiment_trend_context(entity_id, G):
    """Query KG for historical sentiment patterns."""

    # Get time-series sentiment data
    historical = []
    for edge in G.edges(entity_id, data=True):
        if edge[2].get('relation_type') == 'has_sentiment':
            historical.append({
                'date': edge[2].get('timestamp'),
                'score': edge[2].get('sentiment_score')
            })

    # Calculate trend
    if len(historical) >= 5:
        recent = sorted(historical, key=lambda x: x['date'])[-5:]
        trend = (recent[-1]['score'] - recent[0]['score']) / 5
        return {
            'trend_direction': 'improving' if trend > 0.1 else 'declining' if trend < -0.1 else 'stable',
            'trend_magnitude': abs(trend),
            'data_points': len(historical)
        }

    return {'trend_direction': 'insufficient_data', 'data_points': len(historical)}
```

## NLP Sentiment Extraction

```python
import torch
from transformers import pipeline

# Load sentiment model
sentiment_pipeline = pipeline("sentiment-analysis", model="nlptown/bert-base-multilingual-uncased-sentiment")

def extract_sentiment(text):
    """Extract sentiment using transformer model."""

    result = sentiment_pipeline(text[:512])  # Truncate for model

    # Convert 1-5 star rating to -1 to 1 scale
    star_map = {'1 star': -1.0, '2 stars': -0.5, '3 stars': 0.0, '4 stars': 0.5, '5 stars': 1.0}

    label = result[0]['label']
    score = star_map.get(label, 0.0)
    confidence = result[0]['score']

    return {
        'score': score,  # -1 (negative) to 1 (positive)
        'label': 'positive' if score > 0.2 else 'negative' if score < -0.2 else 'neutral',
        'raw_label': label,
        'confidence': confidence
    }

def analyze_message_batch(messages):
    """Batch sentiment analysis with torch optimization."""

    texts = [m['text'][:512] for m in messages]
    results = sentiment_pipeline(texts, batch_size=16)

    return [
        {
            'message_id': msg['id'],
            'sentiment': process_result(res),
            'entities_mentioned': extract_entities(msg['text'])
        }
        for msg, res in zip(messages, results)
    ]
```

## Aggregation to Person/Project

```python
def aggregate_to_person(person_id, G, messages):
    """Aggregate sentiment to person node."""

    person_messages = [m for m in messages if m['sender'] == person_id]
    if not person_messages:
        return None

    sentiments = [m['sentiment']['score'] for m in person_messages]

    return {
        'entity_type': 'person',
        'entity_id': person_id,
        'aggregate_sentiment': sum(sentiments) / len(sentiments),
        'message_count': len(person_messages),
        'positive_ratio': len([s for s in sentiments if s > 0.2]) / len(sentiments),
        'negative_ratio': len([s for s in sentiments if s < -0.2]) / len(sentiments)
    }

def aggregate_to_project(project_id, G, messages):
    """Aggregate sentiment to project node via KG traversal."""

    # Find all messages related to project
    project_messages = []
    for msg in messages:
        # Check if message mentions project or related issues
        related = nx.has_path(G, msg['id'], project_id)
        if related:
            project_messages.append(msg)

    if not project_messages:
        return None

    sentiments = [m['sentiment']['score'] for m in project_messages]

    return {
        'entity_type': 'project',
        'entity_id': project_id,
        'aggregate_sentiment': sum(sentiments) / len(sentiments),
        'message_count': len(project_messages),
        'contributors': list(set(m['sender'] for m in project_messages))
    }
```

## Interactivity for Ambiguous Sentiment

```python
if result['confidence'] < 0.5:
    response = {
        "ambiguity_detected": True,
        "question": f"Sentiment unclear for message: '{message_preview[:100]}...'",
        "options": [
            {"id": 1, "label": "Positive tone"},
            {"id": 2, "label": "Negative tone"},
            {"id": 3, "label": "Neutral/factual"},
            {"id": 4, "label": "Sarcasm/irony (invert)"}
        ],
        "detected": result['label'],
        "confidence": result['confidence']
    }
    ask_user(response)
```

## Output JSON Format

```json
{
  "skill": "sentiment-analysis",
  "timestamp": "2024-01-15T10:00:00Z",
  "results": {
    "messages_analyzed": 150,
    "by_message": [
      {
        "message_id": "chat_abc123",
        "sentiment_score": 0.65,
        "label": "positive",
        "confidence": 0.89,
        "entities_mentioned": ["ENG-123", "alice@example.com"]
      }
    ],
    "by_person": [
      {
        "person_id": "alice@example.com",
        "aggregate_sentiment": 0.45,
        "trend": "stable",
        "message_count": 25,
        "confidence": 0.82
      }
    ],
    "by_project": [
      {
        "project_id": "project:launch-v2",
        "aggregate_sentiment": 0.32,
        "trend": "declining",
        "contributor_count": 8,
        "confidence": 0.75
      }
    ]
  },
  "alerts": [
    {
      "type": "declining_sentiment",
      "entity": "project:launch-v2",
      "current": 0.32,
      "previous": 0.55,
      "confidence": 0.75
    }
  ]
}
```

## Subagent Parallelism

```yaml
parallel_analysis:
  - subagent: sentiment-extractor
    batch: messages[0:100]
  - subagent: sentiment-aggregator-person
    entities: all_persons
  - subagent: sentiment-aggregator-project
    entities: all_projects
```
