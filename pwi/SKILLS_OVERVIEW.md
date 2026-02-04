---
title: Data Analysis Skills Overview
version: 1.0.0
updated: 2026-02-03
total_analysis_skills: 20
categories: 8
---

# Data Analysis Skills Overview

## Pipeline Architecture

```
 DATA SOURCES                    ANALYSIS PIPELINE                         OUTPUTS
 ───────────                    ──────────────────                        ────────
                          ┌─────────────────────────────┐
 Google Chat ──┐          │  Phase 1: ENTITY RESOLUTION │
 Google Cal  ──┤          │  ┌─────────────────────────┐│         KG Nodes
 Google Drive──┤  fetch   │  │ entity-reconciliation   ││──────── & Edges
 Jira ─────────┼────────▶ │  │ graph-update            ││
 Asana ────────┤          │  └─────────────────────────┘│
 Sheets ───────┤          ├─────────────────────────────┤
 Slack ────────┤          │  Phase 2: CORE DETECTION    │
 Email ────────┘          │  ┌────────┐┌───────┐┌─────┐│         Alerts
                          │  │ stale  ││misali-││reply││──────── & Actions
                          │  │ detect ││gnment ││sugg.││
                          │  └────────┘└───────┘└─────┘│
                          ├─────────────────────────────┤
                          │  Phase 3: DEEP ANALYSIS     │
                          │  ┌──────────────────┐       │
                          │  │ sentiment-analysis│       │         Scores
                          │  │ morale-forecasting│───────│──────── & Forecasts
                          │  │ blocker-ident.    │       │
                          │  │ action-extraction │       │
                          │  │ trend-detection   │       │
                          │  └──────────────────┘       │
                          ├─────────────────────────────┤
                          │  Phase 4: KG ENRICHMENT     │
                          │  ┌──────────────────┐       │         Inferred
                          │  │ inference-engine  │       │──────── Edges
                          │  │ knowledge-gap     │       │         & Clusters
                          │  │ semantic-enrich   │       │
                          │  └──────────────────┘       │
                          ├─────────────────────────────┤
                          │  Phase 5: SIMULATION        │
                          │  ┌──────────────────┐       │         Scenarios
                          │  │ ripple-effect-sim │───────│──────── & Impact
                          │  │ what-if-analysis  │       │         Forecasts
                          │  └──────────────────┘       │
                          ├─────────────────────────────┤
                          │  Phase 6: INSIGHTS          │
                          │  ┌──────────────────┐       │         Reports
                          │  │ expertise-mapping │       │──────── & Viz
                          │  │ echo-chamber-det. │       │
                          │  │ innovation-opp.   │       │
                          │  │ graph-viz          │       │
                          │  └──────────────────┘       │
                          ├─────────────────────────────┤
                          │  Phase 7: META              │
                          │  ┌──────────────────┐       │         System
                          │  │ self-improvement  │───────│──────── Health
                          │  └──────────────────┘       │
                          └─────────────────────────────┘
```

## Skills by Category

### 1. Core Issue Detection

Skills that identify immediate problems requiring attention.

| Skill | What It Detects | Confidence | Algorithm |
|-------|----------------|------------|-----------|
| **stale-detection** | Inactive issues/tasks approaching decay | 0.7 | Bayesian decay: `P(stale) = 1 - e^(-λ * days)` with cross-source activity adjustment |
| **misalignment-check** | Contradictions between Jira/Asana/Calendar/Chat | 0.7 | Pairwise field comparison with weighted alignment scoring |
| **reply-suggestion** | Unanswered questions with rising urgency | 0.7 | Intent classification + sender authority weighting + time decay |

**Input**: KG entities (messages, issues, tasks, events)
**Output**: Prioritized alerts with severity and suggested actions

```
stale-detection ─── reads ──▶ issues, tasks (updated_at, status)
                ─── writes ─▶ decay_probability, severity, staleness_days

misalignment ────── reads ──▶ issues, tasks, events (cross-referencing titles, dates, assignees)
                ─── writes ─▶ alignment_score, conflicts[], sync_actions[]

reply-suggestion ── reads ──▶ messages (intent, has_reply, sender history)
                ─── writes ─▶ urgency_probability, suggested_reply, sender_context
```

---

### 2. Sentiment & Morale

Skills that measure team emotional state and predict drops.

| Skill | What It Measures | Confidence | Algorithm |
|-------|-----------------|------------|-----------|
| **sentiment-analysis** | Per-message and aggregate sentiment scores | 0.6 | Transformer NLP (`distilbert-base-uncased-finetuned-sst-2-english`) with KG aggregation |
| **morale-forecasting** | Future morale trajectory per person/team | 0.65 | Exponential smoothing on sentiment time-series + blocker/workload adjusters |

**Input**: Messages, meeting transcripts, activity patterns
**Output**: Sentiment scores (-1.0 to 1.0), morale forecast with intervention suggestions

```
sentiment-analysis ── reads ──▶ messages.text (NLP pipeline)
                   ── writes ─▶ sentiment_score, label, per_person_aggregate, trend

morale-forecasting ── reads ──▶ sentiment time-series, blocker count, workload metrics
                   ── writes ─▶ morale_forecast, drop_probability, intervention_suggestions[]
```

---

### 3. Relationship & Insight Mining

Skills that discover patterns and extract actionable intelligence.

| Skill | What It Discovers | Confidence | Algorithm |
|-------|------------------|------------|-----------|
| **blocker-identification** | Blocking chains and cascade risks | 0.7 | Explicit edge detection + implicit inference (shared assignee + overdue) |
| **action-item-extraction** | Tasks embedded in conversations | 0.65 | Regex + NLP intent patterns, assignee matching via KG expertise |
| **trend-detection** | Recurring patterns and emerging bottlenecks | N/A | Rolling window aggregation, z-score anomaly detection |

**Input**: KG edges (blocks, depends_on), messages, status changes
**Output**: Blockers with cascade probability, extracted action items, trend forecasts

```
blocker-ident ───── reads ──▶ edges (blocks, depends_on), resource allocation
              ───── writes ─▶ blocker_chains[], cascade_probability, critical_path

action-extract ──── reads ──▶ messages, transcripts (NLP pattern matching)
               ──── writes ─▶ action_items[], assignee_suggestions, priority_score

trend-detection ─── reads ──▶ historical status changes, entity counts over time
                ─── writes ─▶ trend_direction, bottleneck_forecast, anomalies[]
```

---

### 4. KG Query & Retrieval

Skills that traverse and clean the knowledge graph.

| Skill | What It Does | Algorithm |
|-------|-------------|-----------|
| **context-query** | Finds related entities via graph traversal | BFS/shortest-path with edge-weight confidence |
| **entity-reconciliation** | Merges duplicate entities | Fuzzy matching (name similarity + email + temporal overlap) |

**Input**: KG nodes and edges
**Output**: Related entity chains, merge candidates with match probability

```
context-query ───── reads ──▶ full KG (BFS from seed node)
              ───── writes ─▶ related_nodes[], influence_chains[], path_confidence

entity-recon ────── reads ──▶ KG nodes (comparing name, email, dates)
             ────── writes ─▶ duplicate_candidates[], merge_operations[], match_probability
```

---

### 5. KG Enrichment & Inference

Skills that add derived knowledge to the graph.

| Skill | What It Infers | Algorithm |
|-------|---------------|-----------|
| **inference-engine** | Hidden relationships (collaborates, similar_to) | Co-occurrence counting + Louvain community detection |
| **knowledge-gap-filler** | Sparse regions needing more data | Node degree analysis + expected vs actual relation count |
| **semantic-enrichment** | Content similarity between entities | Sentence embeddings + cosine similarity + KMeans clustering |

**Input**: Existing KG structure and node text content
**Output**: New inferred edges, gap reports, similarity clusters

```
inference-engine ─── reads ──▶ KG edges (co-occurrence patterns)
                 ─── writes ─▶ inferred_edges (collaborates_with, similar_to), communities[]

knowledge-gap ────── reads ──▶ KG node degrees, entity types
              ────── writes ─▶ sparse_regions[], suggested_mcp_queries[], gap_severity

semantic-enrich ──── reads ──▶ node text properties (title, description)
                ──── writes ─▶ embedding vectors, similar_to edges, theme_clusters[]
```

---

### 6. Simulation & Forecasting

Skills that model hypothetical scenarios on the KG.

| Skill | What It Simulates | Algorithm |
|-------|------------------|-----------|
| **ripple-effect-simulation** | Cascade impact of a change through the graph | BFS propagation + Monte Carlo (N=1000 runs) |
| **what-if-analysis** | Hypothetical scenarios (reassign, delay, remove) | Graph cloning + metric diff (before/after) |

**Input**: KG subgraph + scenario parameters
**Output**: Impact scores, affected entities, probability distributions

```
ripple-effect ───── reads ──▶ KG edges with weights, seed node
              ───── writes ─▶ affected_nodes[], mean_impact, worst_case, cascade_prob

what-if ─────────── reads ──▶ full KG + scenario definition
        ─────────── writes ─▶ scenario_diff, metric_comparison, recommendation
```

---

### 7. Visualization & Expansion

Skills that present insights and discover organizational patterns.

| Skill | What It Produces | Algorithm |
|-------|-----------------|-----------|
| **graph-visualization** | Visual graph layouts in multiple formats | Force-directed, hierarchical, circular layouts |
| **expertise-mapping** | Person-skill relationship map | Activity frequency + tag extraction + confidence scoring |
| **echo-chamber-detection** | Isolated communication silos | Louvain communities + cross-group bridge analysis |
| **innovation-opportunity-spotting** | Underexplored connections and structural holes | Betweenness centrality + weak tie analysis |

```
graph-viz ────────── reads ──▶ KG subgraph (filtered by type/query)
          ────────── writes ─▶ layout JSON, DOT format, Cytoscape format

expertise-mapping ── reads ──▶ person activity across domains (issues, messages, reviews)
                  ── writes ─▶ expertise_scores{}, domain_experts{}, coverage_gaps[]

echo-chamber ─────── reads ──▶ communication edges between people
             ─────── writes ─▶ clusters[], isolation_score, bridge_candidates[]

innovation-opp ──── reads ──▶ KG structure (density, holes, weak ties)
               ──── writes ─▶ structural_holes[], weak_ties[], innovation_score
```

---

### 8. Meta / Self-Optimization

| Skill | What It Monitors | Algorithm |
|-------|-----------------|-----------|
| **self-improvement-loop** | Skill success rates, KG health, system efficiency | Usage analytics + health scoring + improvement plan generation |

```
self-improvement ─── reads ──▶ ./logs/skill_executions.jsonl, KG metrics
                 ─── writes ─▶ underperforming_skills[], kg_health_score, improvement_plan{}
```

---

## Execution Groups

### Parallel Groups (safe to run concurrently)

```yaml
core_analysis:    [stale-detection, misalignment-check, reply-suggestion]
sentiment:        [sentiment-analysis, morale-forecasting]
mining:           [blocker-identification, action-item-extraction, trend-detection]
enrichment:       [inference-engine, knowledge-gap-filler, semantic-enrichment]
expansion:        [expertise-mapping, echo-chamber-detection, innovation-opportunity-spotting]
```

### Sequential Dependencies (must run in order)

```
fetch-* ──▶ entity-reconciliation ──▶ inference-engine ──▶ ripple-effect-simulation
                                                       ──▶ what-if-analysis
                                                       ──▶ self-improvement-loop (last)
```

## Confidence Routing

| Range | Action | Skills Affected |
|-------|--------|----------------|
| >= 0.8 | Auto-execute, log | All skills when high-confidence results |
| 0.5 - 0.8 | Execute + notify user | Most analysis skills at normal operation |
| < 0.5 | Pause, ask user | Any skill hitting low-confidence edge cases |

## Data Flow Summary

```
8 sources ──▶ 8 fetch skills ──▶ entity-reconciliation ──▶ 3 core detectors ──┐
                                                        ──▶ 2 sentiment       ├──▶ notify
                                                        ──▶ 3 miners          │
                                                        ──▶ 3 enrichers       │
                                                        ──▶ 2 simulators ─────┘
                                                        ──▶ 4 expansion skills ──▶ graph-viz
                                                        ──▶ 1 meta skill ──▶ improvement plan
```

**Total analysis surface**: 20 skills processing data from 8 sources through 7 pipeline phases.
