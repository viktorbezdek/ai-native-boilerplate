#!/usr/bin/env bash
# TDD test for graph schema and update skill
# Verifies graph structure and update mechanism

GRAPH_DIR="./graph"
SKILL_PATH=".claude/skills/graph-update/SKILL.md"
SCHEMA_PATH="./graph/schema.json"
PASS=0
FAIL=0

echo "=== Testing Graph Schema & Update Skill ==="

# Test 1: Graph directory exists
echo -n "Test 1: Graph directory exists... "
if [[ -d "$GRAPH_DIR" ]]; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL"
    ((FAIL++))
fi

# Test 2: Schema file exists
echo -n "Test 2: Schema file exists... "
if [[ -f "$SCHEMA_PATH" ]]; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL"
    ((FAIL++))
fi

# Test 3: Schema is valid JSON
echo -n "Test 3: Schema is valid JSON... "
if [[ -f "$SCHEMA_PATH" ]] && python3 -m json.tool "$SCHEMA_PATH" > /dev/null 2>&1; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL"
    ((FAIL++))
fi

# Test 4: Schema defines entity types
echo -n "Test 4: Schema defines entity types... "
if [[ -f "$SCHEMA_PATH" ]] && grep -q '"entities"' "$SCHEMA_PATH"; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL"
    ((FAIL++))
fi

# Test 5: Update skill exists
echo -n "Test 5: Update skill exists... "
if [[ -f "$SKILL_PATH" ]]; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL"
    ((FAIL++))
fi

# Test 6: Update skill has upsert capability
echo -n "Test 6: Skill has upsert capability... "
if [[ -f "$SKILL_PATH" ]] && grep -qi "upsert\|insert\|update" "$SKILL_PATH"; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL"
    ((FAIL++))
fi

# Test 7: Subdirectories for entity types
echo -n "Test 7: Entity subdirectories exist... "
if [[ -d "$GRAPH_DIR/chat" ]] && [[ -d "$GRAPH_DIR/calendar" ]] && [[ -d "$GRAPH_DIR/metrics" ]]; then
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
