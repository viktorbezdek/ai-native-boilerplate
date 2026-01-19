# /analyze $TARGET

Analyze codebase, metrics, or user behavior patterns.

## Arguments
- `$TARGET`: What to analyze (codebase | performance | analytics | dependencies | security)

## Analysis Types

### Codebase Analysis
Examine architecture, patterns, complexity:
- File size distribution
- Import dependency graph
- Cyclomatic complexity hotspots
- Dead code detection
- Duplication analysis

### Performance Analysis
Identify bottlenecks:
- Bundle size breakdown
- Render waterfall analysis
- Database query patterns (N+1)
- API response times
- Memory usage patterns

### Analytics Analysis
User behavior insights from PostHog:
- Funnel conversion rates
- Feature usage heatmaps
- Error frequency by page
- Session recordings summary
- A/B test results

### Dependency Analysis
Package health check:
- Outdated packages
- Security vulnerabilities (npm audit)
- Bundle impact per dependency
- Unused dependencies
- License compliance

### Security Analysis
Threat assessment:
- OWASP Top 10 check
- Exposed secrets scan
- Input validation coverage
- Auth flow review
- CSP headers check

## Output Format
```
## Analysis: $TARGET

### Summary
[One paragraph executive summary]

### Key Findings
1. **[Finding]**: [Impact] - [Recommendation]
2. **[Finding]**: [Impact] - [Recommendation]

### Metrics
| Metric | Current | Target | Status |
|--------|---------|--------|--------|

### Action Items
- [ ] [Priority] [Action]

### Raw Data
[Collapsible detailed data if applicable]
```
