#!/usr/bin/env bash
# TDD test for batch 4 (skills 16-20)

SKILLS_DIR=".claude/skills"
PASS=0
FAIL=0

echo "=== Testing Deep Analysis Batch 4 (Skills 16-20) ==="

BATCH4_SKILLS=(
    "graph-visualization"
    "expertise-mapping"
    "echo-chamber-detection"
    "innovation-opportunity-spotting"
    "self-improvement-loop"
)

for skill in "${BATCH4_SKILLS[@]}"; do
    SKILL_PATH="$SKILLS_DIR/$skill/SKILL.md"

    echo -n "Test: $skill exists... "
    if [[ -f "$SKILL_PATH" ]]; then
        echo "PASS"
        ((PASS++))
    else
        echo "FAIL"
        ((FAIL++))
        continue
    fi

    echo -n "Test: $skill has frontmatter... "
    FIRST_LINE=$(head -1 "$SKILL_PATH" 2>/dev/null)
    if [[ "$FIRST_LINE" == "---" ]]; then
        echo "PASS"
        ((PASS++))
    else
        echo "FAIL"
        ((FAIL++))
    fi

    echo -n "Test: $skill uses KG... "
    if grep -qi "graph\|edge\|node\|KG" "$SKILL_PATH" 2>/dev/null; then
        echo "PASS"
        ((PASS++))
    else
        echo "FAIL"
        ((FAIL++))
    fi

    echo -n "Test: $skill has prob/confidence... "
    if grep -qi "prob\|confidence\|score\|0\.[0-9]" "$SKILL_PATH" 2>/dev/null; then
        echo "PASS"
        ((PASS++))
    else
        echo "FAIL"
        ((FAIL++))
    fi

    echo -n "Test: $skill outputs JSON... "
    if grep -qi "json\|output" "$SKILL_PATH" 2>/dev/null; then
        echo "PASS"
        ((PASS++))
    else
        echo "FAIL"
        ((FAIL++))
    fi

    echo -n "Test: $skill handles uncertainty... "
    if grep -qi "ask\|interactive\|ambig\|uncertain\|feedback\|suggest" "$SKILL_PATH" 2>/dev/null; then
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
