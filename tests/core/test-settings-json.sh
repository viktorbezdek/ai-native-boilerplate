#!/usr/bin/env bash
# TDD test for .claude/settings.json
# Verifies hooks configuration exists and is valid JSON

SETTINGS=".claude/settings.json"
PASS=0
FAIL=0

echo "=== Testing .claude/settings.json ==="

# Test 1: File exists
echo -n "Test 1: settings.json exists... "
if [[ -f "$SETTINGS" ]]; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL - settings.json not found"
    ((FAIL++))
fi

# Test 2: Valid JSON
echo -n "Test 2: Valid JSON format... "
if [[ -f "$SETTINGS" ]] && cat "$SETTINGS" | python3 -m json.tool > /dev/null 2>&1; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL - Invalid JSON"
    ((FAIL++))
fi

# Test 3: Has hooks section
echo -n "Test 3: Has hooks configuration... "
if [[ -f "$SETTINGS" ]] && grep -q '"hooks"' "$SETTINGS"; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL - Missing hooks section"
    ((FAIL++))
fi

# Test 4: Has PreToolUse hook
echo -n "Test 4: Has PreToolUse hook... "
if [[ -f "$SETTINGS" ]] && grep -q '"PreToolUse"' "$SETTINGS"; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL - Missing PreToolUse hook"
    ((FAIL++))
fi

# Test 5: Has PostToolUse hook
echo -n "Test 5: Has PostToolUse hook... "
if [[ -f "$SETTINGS" ]] && grep -q '"PostToolUse"' "$SETTINGS"; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL - Missing PostToolUse hook"
    ((FAIL++))
fi

# Test 6: Has Stop hook
echo -n "Test 6: Has Stop hook... "
if [[ -f "$SETTINGS" ]] && grep -q '"Stop"' "$SETTINGS"; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL - Missing Stop hook"
    ((FAIL++))
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [[ $FAIL -gt 0 ]]; then
    exit 1
else
    exit 0
fi
