---
name: fetch-sheets
description: Fetches business metrics from Google Sheets
version: 2.0.0
trigger:
  - pattern: "fetch sheets"
  - pattern: "get metrics"
  - pattern: "business performance"
  - pattern: "spreadsheet"
tags:
  - fetch
  - google
  - metrics
  - analytics
confidence_threshold: 0.7
mcp_server: google-sheets
---

# Fetch Sheets Skill

Retrieves business performance metrics from Google Sheets for observer analysis.

## Usage

```
/fetch-sheets [spreadsheet_id] [--sheet NAME] [--range A1:Z100]
```

## MCP Integration

Uses `google-sheets` MCP server to query Sheets API.

### Available Operations

1. **List Spreadsheets** - Get accessible spreadsheets
2. **Get Sheet Names** - Tabs in a spreadsheet
3. **Read Range** - Fetch cell data from range
4. **Get Metadata** - Column headers, data types

## Ambiguity Handling

### Spreadsheet Selection

If `METRICS_SPREADSHEET_ID` not set or multiple sheets found:

```json
{
  "ambiguity_detected": true,
  "options": [
    {"id": "abc123", "name": "Q1 2024 Metrics"},
    {"id": "def456", "name": "Product KPIs"}
  ],
  "question": "Which spreadsheet contains your business metrics?"
}
```

### Sheet Tab Selection

If spreadsheet has multiple tabs:
- List tabs with row counts
- Ask which to analyze or select all

### Column Mapping

If headers unclear, ask user to map:
- "Which column is the date? (A, B, C...)"
- "Which columns are metrics? (comma-separated)"

## Output Format

Metrics stored in `./graph/metrics/` as JSON:

```json
{
  "spreadsheet_id": "abc123",
  "sheet_name": "Monthly KPIs",
  "fetched_at": "2024-01-15T10:00:00Z",
  "headers": ["Date", "Revenue", "Users", "Churn"],
  "rows": [
    {"Date": "2024-01", "Revenue": 50000, "Users": 1200, "Churn": 0.02},
    {"Date": "2024-02", "Revenue": 55000, "Users": 1350, "Churn": 0.018}
  ],
  "summary": {
    "row_count": 12,
    "date_range": ["2024-01", "2024-12"],
    "metrics_columns": ["Revenue", "Users", "Churn"]
  }
}
```

## Observer Integration

This skill feeds the **observer agent** for:
- Trend analysis (MoM, YoY growth)
- Anomaly detection (unusual spikes/drops)
- Threshold alerts (churn > 5%, revenue < target)
- Periodic reports (weekly/monthly summaries)

## Scheduling

Default analysis schedule:
- **Daily**: Fetch latest row, check for anomalies
- **Weekly**: Trend analysis, generate summary
- **Monthly**: Full analysis, compare to targets

Configure via `METRICS_ANALYSIS_SCHEDULE` env var.
