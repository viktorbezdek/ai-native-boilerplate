#!/usr/bin/env bash
# TDD test for deep analysis skills batch 1 (skills 1-5)
# Tests: stale-detection, misalignment-check, reply-suggestion, sentiment-analysis, morale-forecasting

SKILLS_DIR=".claude/skills"
PASS=0
FAIL=0

echo "=== Testing Deep Analysis Batch 1 (Skills 1-5) ==="

# Skills in this batch
BATCH1_SKILLS=(
    "stale-detection"
    "misalignment-check"
    "reply-suggestion"
    "sentiment-analysis"
    "morale-forecasting"
)

for skill in "${BATCH1_SKILLS[@]}"; do
    SKILL_PATH="$SKILLS_DIR/$skill/SKILL.md"

    # Test: Skill exists
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

    # Test: Has KG integration
    echo -n "Test: $skill uses knowledge graph... "
    if grep -qi "graph\|KG\|networkx\|traverse\|query" "$SKILL_PATH"; then
        echo "PASS"
        ((PASS++))
    else
        echo "FAIL"
        ((FAIL++))
    fi

    # Test: Has probability/confidence scoring
    echo -n "Test: $skill has prob/confidence... "
    if grep -qi "prob\|confidence\|score\|threshold\|0\.[0-9]" "$SKILL_PATH"; then
        echo "PASS"
        ((PASS++))
    else
        echo "FAIL"
        ((FAIL++))
    fi

    # Test: Has JSON output format
    echo -n "Test: $skill outputs JSON... "
    if grep -qi "json\|output" "$SKILL_PATH"; then
        echo "PASS"
        ((PASS++))
    else
        echo "FAIL"
        ((FAIL++))
    fi

    # Test: Has interactivity for low confidence
    echo -n "Test: $skill handles low confidence... "
    if grep -qi "ask\|interactive\|ambig\|clarif\|< *0\.5\|below" "$SKILL_PATH"; then
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
