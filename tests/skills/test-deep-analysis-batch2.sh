#!/usr/bin/env bash
# TDD test for deep analysis skills batch 2 (skills 6-10)
# Tests: blocker-identification, action-item-extraction, trend-detection, context-query, entity-reconciliation

SKILLS_DIR=".claude/skills"
PASS=0
FAIL=0

echo "=== Testing Deep Analysis Batch 2 (Skills 6-10) ==="

BATCH2_SKILLS=(
    "blocker-identification"
    "action-item-extraction"
    "trend-detection"
    "context-query"
    "entity-reconciliation"
)

for skill in "${BATCH2_SKILLS[@]}"; do
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
    if head -1 "$SKILL_PATH" | grep -q "^---$"; then
        echo "PASS"
        ((PASS++))
    else
        echo "FAIL"
        ((FAIL++))
    fi

    echo -n "Test: $skill uses knowledge graph... "
    if grep -qi "graph\|KG\|networkx\|traverse\|query\|edge" "$SKILL_PATH"; then
        echo "PASS"
        ((PASS++))
    else
        echo "FAIL"
        ((FAIL++))
    fi

    echo -n "Test: $skill has prob/confidence... "
    if grep -qi "prob\|confidence\|score\|weight\|0\.[0-9]" "$SKILL_PATH"; then
        echo "PASS"
        ((PASS++))
    else
        echo "FAIL"
        ((FAIL++))
    fi

    echo -n "Test: $skill outputs JSON... "
    if grep -qi "json\|output" "$SKILL_PATH"; then
        echo "PASS"
        ((PASS++))
    else
        echo "FAIL"
        ((FAIL++))
    fi

    echo -n "Test: $skill handles low confidence... "
    if grep -qi "ask\|interactive\|ambig\|clarif\|< *0\.5\|below\|uncertain" "$SKILL_PATH"; then
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
