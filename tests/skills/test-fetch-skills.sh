#!/usr/bin/env bash
# TDD test for fetch skills
# Verifies all fetch skills exist and have required structure

SKILLS_DIR=".claude/skills"
PASS=0
FAIL=0

echo "=== Testing Fetch Skills ==="

# Required fetch skills
FETCH_SKILLS=(
    "fetch-google-chat"
    "fetch-calendar"
    "fetch-jira"
    "fetch-asana"
    "fetch-sheets"
)

for skill in "${FETCH_SKILLS[@]}"; do
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

    # Test: Has trigger definition
    echo -n "Test: $skill has trigger... "
    if grep -q "trigger:" "$SKILL_PATH"; then
        echo "PASS"
        ((PASS++))
    else
        echo "FAIL"
        ((FAIL++))
    fi

    # Test: Has ambiguity handling
    echo -n "Test: $skill has ambiguity handling... "
    if grep -qi "ambiguity\|ask.*user\|clarif" "$SKILL_PATH"; then
        echo "PASS"
        ((PASS++))
    else
        echo "FAIL"
        ((FAIL++))
    fi

    # Test: References MCP or data source
    echo -n "Test: $skill references data source... "
    if grep -qi "mcp\|api\|fetch\|query" "$SKILL_PATH"; then
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
