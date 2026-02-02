---
name: semantic-enrichment
description: Embeds node properties and infers similarTo relations through clustering. Use when finding semantic similarities or grouping related entities.
---

# Semantic Enrichment

Embed and cluster nodes for similarity inference.

## Embedding Generation

```python
import torch
from transformers import AutoTokenizer, AutoModel
import numpy as np

def embed_node(node_data, model, tokenizer):
    """Generate embedding for node text content."""
    text = ' '.join([
        str(node_data.get('name', '')),
        str(node_data.get('description', '')),
        str(node_data.get('summary', ''))
    ])

    inputs = tokenizer(text[:512], return_tensors='pt', truncation=True, padding=True)
    with torch.no_grad():
        outputs = model(**inputs)
        embedding = outputs.last_hidden_state.mean(dim=1).numpy()[0]

    return embedding

def embed_all_nodes(G, model, tokenizer):
    """Batch embed all nodes."""
    embeddings = {}
    for node, data in G.nodes(data=True):
        embeddings[node] = embed_node(data, model, tokenizer)
    return embeddings
```

## Similarity Inference

```python
from sklearn.metrics.pairwise import cosine_similarity

def infer_similar_to(embeddings, threshold=0.75):
    """Infer similarTo edges from embeddings."""
    nodes = list(embeddings.keys())
    vectors = np.array([embeddings[n] for n in nodes])

    similarities = cosine_similarity(vectors)

    similar_pairs = []
    for i, node_a in enumerate(nodes):
        for j, node_b in enumerate(nodes[i+1:], i+1):
            sim = similarities[i, j]
            if sim >= threshold:
                similar_pairs.append({
                    'source': node_a,
                    'target': node_b,
                    'relation': 'similar_to',
                    'confidence': round(float(sim), 3)
                })

    return similar_pairs
```

## Theme Clustering

```python
from sklearn.cluster import KMeans

def cluster_themes(embeddings, n_clusters=5):
    """Cluster nodes into themes."""
    nodes = list(embeddings.keys())
    vectors = np.array([embeddings[n] for n in nodes])

    kmeans = KMeans(n_clusters=n_clusters, random_state=42)
    labels = kmeans.fit_predict(vectors)

    clusters = {}
    for node, label in zip(nodes, labels):
        clusters.setdefault(int(label), []).append(node)

    return [{'theme_id': k, 'nodes': v, 'size': len(v)} for k, v in clusters.items()]
```

## Interactivity

Ask when similarity uncertain: "Link {A} and {B} as similar? (score: 0.48)"

## Output

```json
{
  "skill": "semantic-enrichment",
  "similar_pairs": [{"source": "ENG-1", "target": "ENG-5", "confidence": 0.82}],
  "themes": [{"theme_id": 0, "nodes": ["ENG-1", "ENG-5"], "size": 2}],
  "edges_added": 18,
  "confidence": 0.76
}
```
