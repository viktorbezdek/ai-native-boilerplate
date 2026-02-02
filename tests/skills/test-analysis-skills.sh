#!/usr/bin/env bash
# TDD test for analysis skills
# Verifies stale detection, misalignment, and reply suggestion skills

SKILLS_DIR=".claude/skills"
PASS=0
FAIL=0

echo "=== Testing Analysis Skills ==="

# Analysis skills to test
ANALYSIS_SKILLS=(
    "analyze-stale"
    "analyze-misalignment"
    "suggest-reply"
)

for skill in "${ANALYSIS_SKILLS[@]}"; do
    SKILL_PATH="$SKILLS_DIR/$skill/SKILL.md"

    # Test: Skill file exists
    echo -n "Test: $skill exists... "
    if [[ -f "$SKILL_PATH" ]]; then
        echo "PASS"
        ((PASS++))
    else
        echo "FAIL"
        ((FAIL++))
        continue
    fi

    # Test: Has YAML frontmatter
    echo -n "Test: $skill has frontmatter... "
    if head -1 "$SKILL_PATH" | grep -q "^---$"; then
        echo "PASS"
        ((PASS++))
    else
        echo "FAIL"
        ((FAIL++))
    fi

    # Test: Has threshold/configurable parameters
    echo -n "Test: $skill has configurable thresholds... "
    if grep -qi "threshold\|config\|parameter\|days\|hour" "$SKILL_PATH"; then
        echo "PASS"
        ((PASS++))
    else
        echo "FAIL"
        ((FAIL++))
    fi

    # Test: References graph data
    echo -n "Test: $skill uses graph data... "
    if grep -qi "graph\|entity\|@mcp" "$SKILL_PATH"; then
        echo "PASS"
        ((PASS++))
    else
        echo "FAIL"
        ((FAIL++))
    fi

    # Test: Has output format defined
    echo -n "Test: $skill defines output... "
    if grep -qi "output\|result\|report" "$SKILL_PATH"; then
        echo "PASS"
        ((PASS++))
    else
        echo "FAIL"
        ((FAIL++))
    fi
done

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [[ $FAIL -gt 0 ]]; then
    exit 1
else
    exit 0
fi
