# /full-process Command

Complete rebuild of knowledge graph and full 20-skill deep analysis.

## Workflow

```
Phase 1: Fetch (Parallel)
├── @skill fetch-google-chat
├── @skill fetch-calendar
├── @skill fetch-jira
├── @skill fetch-asana
└── @skill fetch-sheets

Phase 2: Update Graph
├── @skill graph-update (batch all fetched data)
└── @skill entity-reconciliation (merge duplicates)

Phase 3: KG Enrichment (Parallel)
├── @skill inference-engine
├── @skill knowledge-gap-filler
└── @skill semantic-enrichment

Phase 4: Core Analysis (Parallel)
├── @skill stale-detection
├── @skill misalignment-check
└── @skill reply-suggestion

Phase 5: Sentiment & Morale (Parallel)
├── @skill sentiment-analysis
└── @skill morale-forecasting

Phase 6: Relationship Mining (Parallel)
├── @skill blocker-identification
├── @skill action-item-extraction
└── @skill trend-detection

Phase 7: Advanced Analysis (Sequential)
├── @skill context-query (gather context for simulation)
├── @skill ripple-effect-simulation
└── @skill what-if-analysis

Phase 8: Insights & Visualization (Parallel)
├── @skill graph-visualization
├── @skill expertise-mapping
├── @skill echo-chamber-detection
└── @skill innovation-opportunity-spotting

Phase 9: Meta-Analysis
└── @skill self-improvement-loop

Phase 10: Report & Notify
├── Generate summary report
└── @skill notify (for critical items with confidence ≥ 0.7)
```

## Execution Steps

### Step 1: Parallel Fetch

Spawn concurrent subagents for each data source:

```yaml
parallel:
  - agent: fetch-worker
    skill: fetch-google-chat
    output: ./data/chat_raw.json
  - agent: fetch-worker
    skill: fetch-calendar
    output: ./data/calendar_raw.json
  - agent: fetch-worker
    skill: fetch-jira
    output: ./data/jira_raw.json
  - agent: fetch-worker
    skill: fetch-asana
    output: ./data/asana_raw.json
  - agent: fetch-worker
    skill: fetch-sheets
    output: ./data/metrics_raw.json
```

### Step 2: Graph Update & Reconciliation

```yaml
sequential:
  - skill: graph-update
    input: ./data/*_raw.json
    output: ./graph/
  - skill: entity-reconciliation
    input: ./graph/
    threshold: 0.7
    on_low_confidence: ask_user
```

### Step 3: KG Enrichment

```yaml
parallel:
  - skill: inference-engine
    confidence_threshold: 0.6
  - skill: knowledge-gap-filler
    max_gaps_to_fill: 50
  - skill: semantic-enrichment
    embedding_model: sentence-transformers
```

### Step 4: Core Analysis

```yaml
parallel:
  - agent: analyst
    skill: stale-detection
    params:
      decay_threshold_days: 14
      confidence_min: 0.5
  - agent: analyst
    skill: misalignment-check
    params:
      confidence_min: 0.5
  - agent: analyst
    skill: reply-suggestion
    params:
      urgency_threshold: 0.7
```

### Step 5: Sentiment Analysis

```yaml
parallel:
  - skill: sentiment-analysis
    aggregate_by: [person, team, project]
  - skill: morale-forecasting
    horizon_days: 14
    alert_on_drop_prob: 0.7
```

### Step 6: Relationship Mining

```yaml
parallel:
  - skill: blocker-identification
    cascade_depth: 3
  - skill: action-item-extraction
    extract_from: [messages, transcripts, comments]
  - skill: trend-detection
    window_days: 90
    min_trend_confidence: 0.6
```

### Step 7: Advanced Analysis

```yaml
sequential:
  - skill: context-query
    gather_for: [high_priority_items, at_risk_entities]
  - skill: ripple-effect-simulation
    scenarios: [blocker_resolution, deadline_change]
    monte_carlo_iterations: 1000
  - skill: what-if-analysis
    hypotheticals: [resource_addition, scope_change]
```

### Step 8: Insights & Visualization

```yaml
parallel:
  - skill: graph-visualization
    layout: force_directed
    export_formats: [json, dot]
  - skill: expertise-mapping
    build_skill_edges: true
  - skill: echo-chamber-detection
    isolation_threshold: 0.8
  - skill: innovation-opportunity-spotting
    min_opportunity_score: 0.6
```

### Step 9: Meta-Analysis

```yaml
sequential:
  - skill: self-improvement-loop
    analyze:
      - skill_usage
      - kg_health
      - confidence_trends
    suggest_improvements: true
```

### Step 10: Notify

For high-priority findings:

```yaml
sequential:
  - skill: notify
    conditions:
      - results.severity == "high"
      - results.confidence >= 0.7
      - results.drop_probability > 0.7
    group_by: entity_type
```

## Confidence-Based Flow Control

```python
for skill_result in all_results:
    if skill_result.confidence < 0.5:
        # Pause and ask user
        response = ask_user({
            "skill": skill_result.skill,
            "finding": skill_result.summary,
            "confidence": skill_result.confidence,
            "question": "Accept this finding or provide more context?"
        })
        if response == "provide_context":
            # Re-run with additional context
            continue
```

## Output

```json
{
  "command": "full-process",
  "started_at": "2024-01-15T03:00:00Z",
  "completed_at": "2024-01-15T03:08:00Z",
  "phases": {
    "fetch": {"status": "complete", "items": 1250},
    "graph_update": {"status": "complete", "upserted": 1250, "merged": 15},
    "enrichment": {"status": "complete", "edges_inferred": 89, "gaps_filled": 12},
    "core_analysis": {"status": "complete", "findings": 15},
    "sentiment": {"status": "complete", "entities_analyzed": 50},
    "mining": {"status": "complete", "blockers": 8, "actions": 23, "trends": 5},
    "advanced": {"status": "complete", "simulations": 3, "what_ifs": 2},
    "insights": {"status": "complete", "opportunities": 7, "echo_chambers": 2},
    "meta": {"status": "complete", "improvements_suggested": 4},
    "notify": {"status": "complete", "sent": 5}
  },
  "summary": {
    "stale_items": 8,
    "misalignments": 4,
    "pending_replies": 3,
    "morale_at_risk": 2,
    "blockers": 8,
    "innovation_opportunities": 7,
    "overall_kg_health": 0.82
  },
  "user_interactions": 2,
  "low_confidence_findings": 3
}
```

## Async Execution

For cron/background:
```bash
./scripts/full_process.sh
```

Or directly:
```bash
claude -p @scripts/full_process_prompt.txt --output-format json > ./logs/full_process_$(date +%Y%m%d).json
```
