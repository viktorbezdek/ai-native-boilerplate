# /optimize $TARGET

Self-improvement cycle for Claude Code configuration.

## Arguments
- `$TARGET`: What to optimize (skills | commands | context | all)

## Optimization Process

### 1. Collect Session Data
Read from `.claude/logs/sessions/`:
- Which skills activated and how often
- Command usage patterns
- Error frequencies
- Rework rates
- Token usage per task type

### 2. Analyze Patterns

#### Skill Analysis
- Skills never activated → review description clarity
- Skills with high rework → add more examples/constraints
- Missing skill needs → identify gaps from failed tasks

#### Command Analysis
- Frequently modified outputs → improve templates
- Chained commands → create composite command
- Unused commands → consider removal

#### Context Analysis
- CLAUDE.md sections never referenced → trim
- Frequently needed clarifications → add to context
- @imports never loaded → remove or promote to root

### 3. Generate Improvements

For each finding, generate:
- Specific file changes
- Rationale
- Expected impact

### 4. Apply Changes
**REQUIRES HUMAN APPROVAL for:**
- Skill modifications
- Command deletions
- settings.json changes

**Auto-apply:**
- CLAUDE.md updates (non-destructive)
- Log cleanup
- Performance tuning

## Output Format
```
## Optimization Report

**Period**: [date range]
**Sessions Analyzed**: [count]

### Metrics
| Metric | Before | After (Est.) | Change |
|--------|--------|--------------|--------|
| Avg tokens/task | X | Y | -Z% |
| First-pass accuracy | X% | Y% | +Z% |
| Rework rate | X% | Y% | -Z% |

### Findings

#### High Impact
1. **[Finding]**
   - Evidence: [data]
   - Recommendation: [action]
   - File: [path]

#### Medium Impact
...

### Proposed Changes
1. **[File]**: [change description]
   - [ ] Approved
   
2. **[File]**: [change description]
   - [ ] Approved

### Auto-Applied
- [change 1]
- [change 2]

### Next Review
Scheduled: [date]
```

## Automation Hook
This command runs automatically:
- Weekly (via GitHub Actions cron)
- After every 50 sessions (via log-session.sh trigger)
