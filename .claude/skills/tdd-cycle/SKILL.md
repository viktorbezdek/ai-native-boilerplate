---
name: tdd-cycle
description: Test-Driven Development cycle enforcement skill
version: 1.0.0
trigger:
  - pattern: "/tdd-cycle"
  - pattern: "implement using TDD"
  - pattern: "test-driven"
tags:
  - testing
  - methodology
  - core
---

# TDD Cycle Skill

Enforces strict RED-GREEN-REFACTOR methodology for all development work.

## Workflow

### 1. RED - Write Failing Test First

Before writing any implementation code:
- Create a test that defines the expected behavior
- Run the test to confirm it **fails**
- The failure message should clearly indicate what's missing

```bash
# Example: verify test fails
./tests/my-test.sh
# Expected: exit code 1 (failure)
```

### 2. GREEN - Minimal Implementation

Write the **minimum code** necessary to make the test pass:
- No extra features
- No premature optimization
- Just enough to turn red to green

```bash
# Example: verify test passes
./tests/my-test.sh
# Expected: exit code 0 (success)
```

### 3. REFACTOR - Clean & Optimize

With passing tests as safety net:
- Remove duplication
- Improve naming
- Optimize for readability
- Add comments where non-obvious
- Re-run tests to ensure they still pass

## Ambiguity Handling

When ambiguity is detected (probability > 50%), the skill will:

1. **Set flag**: Output `{"ambiguity_detected": true}` in JSON responses
2. **Interactive prompt**: Present numbered choices to user
3. **Ask for clarification**: Use AskUserQuestion tool for complex decisions
4. **macOS notification**: For high-importance ambiguous decisions

### Ambiguity Detection Triggers

- Multiple valid interpretations of requirements
- Missing critical information (paths, tokens, thresholds)
- Conflicting constraints
- Unclear scope boundaries

### Response Format for Ambiguous Situations

```json
{
  "ambiguity_detected": true,
  "confidence": 0.4,
  "options": [
    {"id": 1, "description": "Option A"},
    {"id": 2, "description": "Option B"}
  ],
  "question": "Which approach should we take?"
}
```

## Usage

Invoke this skill by:
- Running `/tdd-cycle` command
- Mentioning "implement using TDD" in requests
- Starting any feature work (auto-triggered)

## Output

All TDD cycles should log to `./logs/tdd-cycles.jsonl`:

```json
{"timestamp": "ISO8601", "phase": "RED|GREEN|REFACTOR", "test": "path", "result": "pass|fail"}
```
