---
name: scope-guardian
description: Detects scope creep mid-execution. Compares current work against original spec, flags drift, suggests backlog items.
allowed-tools:
  - Read
  - Grep
  - Glob
---

# Scope Guardian

Monitors execution for scope creep and ensures alignment with original specifications.

## When to Use

- During feature implementation to check alignment
- When tasks seem to be expanding beyond original scope
- Before starting work on "just one more thing"
- During code review to identify scope drift
- When estimating if a change fits current sprint

## Capabilities

### Scope Analysis
- Compare current work against original requirements
- Identify additions not in original spec
- Flag feature creep in PRs
- Detect gold-plating attempts

### Backlog Management
- Suggest items for future backlog
- Categorize out-of-scope work
- Prioritize deferred items

### Boundary Enforcement
- Define clear scope boundaries
- Document intentional scope decisions
- Track scope change requests

## Process

1. **Load Original Spec**
   - Read issue/ticket description
   - Identify acceptance criteria
   - Note explicit exclusions

2. **Analyze Current Work**
   - Review files modified
   - Compare against requirements
   - Identify additions/changes

3. **Evaluate Alignment**
   - In-scope: Required by spec
   - Adjacent: Related but not required
   - Out-of-scope: Not related to spec

4. **Report Findings**
   - List scope drift items
   - Suggest backlog items
   - Recommend action

## Output Format

```markdown
## Scope Analysis: [Feature/Task Name]

### Original Requirements
- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 3

### Current Implementation Status

#### In Scope ✓
- [Item]: Directly addresses [requirement]

#### Adjacent (Review Needed) ⚠️
- [Item]: Related to scope but not explicitly required
  - Recommendation: [Include/Defer/Remove]

#### Out of Scope ✗
- [Item]: Not part of original requirements
  - Recommendation: Move to backlog as [ticket type]

### Scope Drift Score
[Low/Medium/High]

### Recommendations
1. [Action item]
2. [Action item]

### Suggested Backlog Items
- [ ] [Item 1] - [Priority]
- [ ] [Item 2] - [Priority]
```

## Scope Drift Indicators

### Code Changes
- Files modified outside feature directory
- New dependencies added
- Configuration changes not in spec
- Test coverage for unrelated features

### Feature Additions
- UI elements not in designs
- API endpoints not in spec
- Database columns not required
- Error handling beyond requirements

### Refactoring Creep
- "While we're here" improvements
- Unrelated code cleanup
- Style changes in untouched files
- Dependency updates

## Best Practices

1. **Reference the spec** - Always check original requirements
2. **Document decisions** - Record why something is in/out of scope
3. **Defer, don't delete** - Out-of-scope items may be valuable later
4. **Small PRs** - Easier to identify scope drift in focused changes
5. **Early detection** - Check scope alignment before deep implementation

## Example Analysis

```markdown
## Scope Analysis: Add Dark Mode Toggle

### Original Requirements
- [ ] Add toggle in settings page
- [ ] Persist preference in localStorage
- [ ] Apply theme to all pages

### Current Implementation Status

#### In Scope ✓
- Toggle component in settings
- localStorage persistence
- CSS variables for theming

#### Adjacent ⚠️
- System preference detection (prefers-color-scheme)
  - Recommendation: Include (improves UX, minimal effort)

#### Out of Scope ✗
- Custom color picker for themes
  - Recommendation: Backlog as "Custom Theme Colors" (P2)
- Transition animations between themes
  - Recommendation: Backlog as "Theme Transition Polish" (P3)

### Scope Drift Score: Medium
The custom color picker adds significant scope.

### Recommendations
1. Remove custom color picker from this PR
2. Keep system preference detection
3. Create follow-up tickets for deferred items
```
