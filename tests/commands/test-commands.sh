#!/usr/bin/env bash
# TDD test for /full-process and /update commands
# Verifies command definitions exist

COMMANDS_DIR=".claude/commands"
PASS=0
FAIL=0

echo "=== Testing Command Definitions ==="

# Commands to test
COMMANDS=(
    "full-process"
    "update"
)

for cmd in "${COMMANDS[@]}"; do
    CMD_PATH="$COMMANDS_DIR/$cmd.md"

    # Test: Command file exists
    echo -n "Test: $cmd command exists... "
    if [[ -f "$CMD_PATH" ]]; then
        echo "PASS"
        ((PASS++))
    else
        echo "FAIL"
        ((FAIL++))
        continue
    fi

    # Test: Has workflow definition
    echo -n "Test: $cmd has workflow... "
    if grep -qi "workflow\|step\|phase" "$CMD_PATH"; then
        echo "PASS"
        ((PASS++))
    else
        echo "FAIL"
        ((FAIL++))
    fi

    # Test: References skills
    echo -n "Test: $cmd uses skills... "
    if grep -qi "@skill\|fetch\|analyze" "$CMD_PATH"; then
        echo "PASS"
        ((PASS++))
    else
        echo "FAIL"
        ((FAIL++))
    fi

    # Test: Has parallel execution capability
    echo -n "Test: $cmd supports parallel... "
    if grep -qi "parallel\|concurrent\|subagent\|async" "$CMD_PATH"; then
        echo "PASS"
        ((PASS++))
    else
        echo "FAIL"
        ((FAIL++))
    fi
done

# Test: Prompt files exist
echo -n "Test: full_process_prompt.txt exists... "
if [[ -f "scripts/full_process_prompt.txt" ]]; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL"
    ((FAIL++))
fi

echo -n "Test: update_prompt.txt exists... "
if [[ -f "scripts/update_prompt.txt" ]]; then
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
