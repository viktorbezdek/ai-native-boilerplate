#!/usr/bin/env bash
# TDD test for CLAUDE.md configuration
# Verifies project instructions file has required sections

CLAUDE_MD="CLAUDE.md"
PASS=0
FAIL=0

echo "=== Testing CLAUDE.md ==="

# Test 1: File exists
echo -n "Test 1: CLAUDE.md exists... "
if [[ -f "$CLAUDE_MD" ]]; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL - CLAUDE.md not found"
    ((FAIL++))
fi

# Test 2: Has project overview section
echo -n "Test 2: Has project overview... "
if [[ -f "$CLAUDE_MD" ]] && grep -qi "overview\|description\|about" "$CLAUDE_MD"; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL - Missing project overview"
    ((FAIL++))
fi

# Test 3: Has @import references for modular config
echo -n "Test 3: Has @import references... "
if [[ -f "$CLAUDE_MD" ]] && grep -q "@import\|@include\|@skill" "$CLAUDE_MD"; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL - Missing @import references"
    ((FAIL++))
fi

# Test 4: Has critical rules section
echo -n "Test 4: Has critical rules... "
if [[ -f "$CLAUDE_MD" ]] && grep -qi "rules\|constraints\|requirements\|must\|never" "$CLAUDE_MD"; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL - Missing critical rules"
    ((FAIL++))
fi

# Test 5: Has interactivity guidelines
echo -n "Test 5: Has interactivity guidelines... "
if [[ -f "$CLAUDE_MD" ]] && grep -qi "interactive\|ask\|confirm\|ambiguity" "$CLAUDE_MD"; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL - Missing interactivity guidelines"
    ((FAIL++))
fi

# Test 6: References TDD workflow
echo -n "Test 6: References TDD workflow... "
if [[ -f "$CLAUDE_MD" ]] && grep -qi "TDD\|test-driven\|red.*green" "$CLAUDE_MD"; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL - Missing TDD references"
    ((FAIL++))
fi

# Test 7: Has data sources section (for PWI system)
echo -n "Test 7: Has data sources config... "
if [[ -f "$CLAUDE_MD" ]] && grep -qi "google\|jira\|asana\|calendar\|chat" "$CLAUDE_MD"; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL - Missing data sources config"
    ((FAIL++))
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [[ $FAIL -gt 0 ]]; then
    exit 1
else
    exit 0
fi
