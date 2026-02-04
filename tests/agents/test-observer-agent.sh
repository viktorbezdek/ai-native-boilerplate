#!/usr/bin/env bash
# TDD test for observer agent
# Verifies observer agent exists and has required structure

AGENT_PATH=".claude/agents/observer.md"
PASS=0
FAIL=0

echo "=== Testing Observer Agent ==="

# Test 1: Agent file exists
echo -n "Test 1: observer.md exists... "
if [[ -f "$AGENT_PATH" ]]; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL - $AGENT_PATH not found"
    ((FAIL++))
fi

# Test 2: Has agent description
echo -n "Test 2: Has agent description... "
if [[ -f "$AGENT_PATH" ]] && grep -qi "observer\|monitor\|analyz" "$AGENT_PATH"; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL - Missing agent description"
    ((FAIL++))
fi

# Test 3: References metrics/sheets
echo -n "Test 3: References metrics analysis... "
if [[ -f "$AGENT_PATH" ]] && grep -qi "metric\|sheet\|performance\|kpi" "$AGENT_PATH"; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL - Missing metrics references"
    ((FAIL++))
fi

# Test 4: Has analysis capabilities
echo -n "Test 4: Has analysis capabilities... "
if [[ -f "$AGENT_PATH" ]] && grep -qi "trend\|anomal\|threshold\|alert" "$AGENT_PATH"; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL - Missing analysis capabilities"
    ((FAIL++))
fi

# Test 5: Has scheduling/periodic section
echo -n "Test 5: Has scheduling info... "
if [[ -f "$AGENT_PATH" ]] && grep -qi "schedule\|periodic\|daily\|weekly\|cron" "$AGENT_PATH"; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL - Missing scheduling info"
    ((FAIL++))
fi

# Test 6: Has output/notification section
echo -n "Test 6: Has notification capability... "
if [[ -f "$AGENT_PATH" ]] && grep -qi "notif\|alert\|report\|output" "$AGENT_PATH"; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL - Missing notification capability"
    ((FAIL++))
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [[ $FAIL -gt 0 ]]; then
    exit 1
else
    exit 0
fi
