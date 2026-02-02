#!/usr/bin/env bash
# TDD test for notification skill
# Verifies macOS notification with action buttons

SKILL_PATH=".claude/skills/notify/SKILL.md"
SCRIPT_PATH=".claude/skills/notify/notify.sh"
PASS=0
FAIL=0

echo "=== Testing Notification Skill ==="

# Test 1: Skill file exists
echo -n "Test 1: Skill file exists... "
if [[ -f "$SKILL_PATH" ]]; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL"
    ((FAIL++))
fi

# Test 2: Has osascript reference
echo -n "Test 2: Uses osascript... "
if [[ -f "$SKILL_PATH" ]] && grep -qi "osascript" "$SKILL_PATH"; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL"
    ((FAIL++))
fi

# Test 3: Has button actions
echo -n "Test 3: Has button actions... "
if [[ -f "$SKILL_PATH" ]] && grep -qi "button\|action\|send\|edit\|reject" "$SKILL_PATH"; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL"
    ((FAIL++))
fi

# Test 4: Notification script exists
echo -n "Test 4: Notification script exists... "
if [[ -f "$SCRIPT_PATH" ]]; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL"
    ((FAIL++))
fi

# Test 5: Script is executable
echo -n "Test 5: Script is executable... "
if [[ -x "$SCRIPT_PATH" ]]; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL"
    ((FAIL++))
fi

# Test 6: Has callback mechanism
echo -n "Test 6: Has callback mechanism... "
if [[ -f "$SKILL_PATH" ]] && grep -qi "callback\|response\|handler" "$SKILL_PATH"; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL"
    ((FAIL++))
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [[ $FAIL -gt 0 ]]; then
    exit 1
else
    exit 0
fi
