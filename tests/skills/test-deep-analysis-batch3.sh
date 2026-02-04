#!/usr/bin/env bash
# TDD test for batch 3 (skills 11-15)

SKILLS_DIR=".claude/skills"
PASS=0
FAIL=0

echo "=== Testing Deep Analysis Batch 3 (Skills 11-15) ==="

BATCH3_SKILLS=(
    "inference-engine"
    "knowledge-gap-filler"
    "semantic-enrichment"
    "ripple-effect-simulation"
    "what-if-analysis"
)

for skill in "${BATCH3_SKILLS[@]}"; do
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
    if grep -qi "graph\|edge\|node\|traverse" "$SKILL_PATH" 2>/dev/null; then
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
    if grep -qi "ask\|interactive\|ambig\|uncertain\|< *0\.5" "$SKILL_PATH" 2>/dev/null; then
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
