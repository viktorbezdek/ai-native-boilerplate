#!/usr/bin/env bash
# RED-GREEN-REFACTOR test for tdd-cycle skill
# This test verifies the skill exists and has required structure

SKILL_PATH=".claude/skills/tdd-cycle/SKILL.md"
PASS=0
FAIL=0

echo "=== Testing tdd-cycle skill ==="

# Test 1: Skill file exists
echo -n "Test 1: SKILL.md exists... "
if [[ -f "$SKILL_PATH" ]]; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL - $SKILL_PATH not found"
    ((FAIL++))
fi

# Test 2: Has YAML frontmatter
echo -n "Test 2: Has YAML frontmatter... "
if [[ -f "$SKILL_PATH" ]] && head -1 "$SKILL_PATH" | grep -q "^---$"; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL - Missing YAML frontmatter"
    ((FAIL++))
fi

# Test 3: Contains RED-GREEN-REFACTOR keywords
echo -n "Test 3: Contains TDD cycle keywords... "
if [[ -f "$SKILL_PATH" ]] && grep -q "RED" "$SKILL_PATH" && grep -q "GREEN" "$SKILL_PATH" && grep -q "REFACTOR" "$SKILL_PATH"; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL - Missing RED/GREEN/REFACTOR keywords"
    ((FAIL++))
fi

# Test 4: Contains ambiguity handling section
echo -n "Test 4: Has ambiguity handling... "
if [[ -f "$SKILL_PATH" ]] && grep -qi "ambiguity" "$SKILL_PATH"; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL - Missing ambiguity handling"
    ((FAIL++))
fi

# Test 5: Has trigger definition in frontmatter
echo -n "Test 5: Has trigger definition... "
if [[ -f "$SKILL_PATH" ]] && grep -q "trigger:" "$SKILL_PATH"; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL - Missing trigger definition"
    ((FAIL++))
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [[ $FAIL -gt 0 ]]; then
    exit 1
else
    exit 0
fi
