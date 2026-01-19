---
name: task-decomposer
description: Transforms feature requests or bug reports into actionable task DAGs with complexity estimates. Use when planning implementation of new features, breaking down epics, or creating sprint backlogs.
allowed-tools: Read, Grep, Glob, mcp__linear__*, mcp__github__*
---

# Task Decomposition Skill

## Purpose
Convert ambiguous requirements into structured, dependency-aware task lists suitable for implementation by developer agents.

## Process

### 1. Requirement Analysis
- Extract explicit requirements
- Identify implicit requirements
- Note ambiguities and assumptions
- Determine acceptance criteria

### 2. Component Mapping
- Identify affected systems/files
- Map to existing architecture
- Note new components needed
- Identify integration points

### 3. Task Generation
For each logical unit of work:
- Write clear, actionable task description
- Estimate complexity (S/M/L/XL)
- Identify dependencies
- Assign to appropriate agent type

### 4. Dependency Resolution
- Build directed acyclic graph (DAG)
- Identify parallelizable tasks
- Find critical path
- Optimize for minimum total time

### 5. Validation
- Ensure complete coverage of requirements
- Verify no circular dependencies
- Check complexity distribution
- Validate estimates against historical data

## Task Template
```markdown
## Task: [ACTION] [COMPONENT]

**Complexity**: S | M | L | XL
**Agent**: developer | tester | reviewer
**Dependencies**: [task-ids]
**Parallelizable**: yes | no

### Description
[Clear, actionable description]

### Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]

### Files Likely Affected
- [file-path]

### Technical Notes
[Any relevant technical context]
```

## Complexity Guidelines
- **S (Small)**: < 30 min, single file, no new patterns
- **M (Medium)**: 30min-2hr, few files, follows existing patterns
- **L (Large)**: 2-4hr, multiple files, some new patterns
- **XL (Extra Large)**: > 4hr, architectural changes, new systems

## Output Format
```markdown
# Task Breakdown: [Feature Name]

## Summary
- Total tasks: X
- Critical path: Y tasks
- Estimated effort: Z hours
- Parallelization potential: W%

## Task DAG
[Mermaid diagram of dependencies]

## Tasks

### Phase 1: [Phase Name]
[Tasks with no dependencies]

### Phase 2: [Phase Name]
[Tasks depending on Phase 1]

...

## Risks & Assumptions
- [Risk/Assumption 1]
```
