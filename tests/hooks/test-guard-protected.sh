#!/usr/bin/env bash
# TDD test for protected file guard hook
# Verifies the hook blocks edits to protected files

HOOK=".claude/hooks/guard-protected.sh"
PASS=0
FAIL=0

echo "=== Testing guard-protected.sh hook ==="

# Test 1: Hook file exists
echo -n "Test 1: Hook file exists... "
if [[ -f "$HOOK" ]]; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL - $HOOK not found"
    ((FAIL++))
fi

# Test 2: Hook is executable
echo -n "Test 2: Hook is executable... "
if [[ -x "$HOOK" ]]; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL - Hook not executable"
    ((FAIL++))
fi

# Test 3: Blocks .env file edits (exit 1)
echo -n "Test 3: Blocks .env file edits... "
if [[ -x "$HOOK" ]]; then
    OUTPUT=$("$HOOK" '{"file_path": ".env"}' 2>&1)
    if [[ $? -eq 2 ]]; then
        echo "PASS"
        ((PASS++))
    else
        echo "FAIL - Should block .env edits with exit 2"
        ((FAIL++))
    fi
else
    echo "SKIP - Hook not executable"
    ((FAIL++))
fi

# Test 4: Blocks credential files
echo -n "Test 4: Blocks credential files... "
if [[ -x "$HOOK" ]]; then
    OUTPUT=$("$HOOK" '{"file_path": "secrets.key"}' 2>&1)
    if [[ $? -eq 2 ]]; then
        echo "PASS"
        ((PASS++))
    else
        echo "FAIL - Should block .key files with exit 2"
        ((FAIL++))
    fi
else
    echo "SKIP - Hook not executable"
    ((FAIL++))
fi

# Test 5: Allows normal file edits (exit 0)
echo -n "Test 5: Allows normal file edits... "
if [[ -x "$HOOK" ]]; then
    OUTPUT=$("$HOOK" '{"file_path": "src/index.ts"}' 2>&1)
    if [[ $? -eq 0 ]]; then
        echo "PASS"
        ((PASS++))
    else
        echo "FAIL - Should allow normal files"
        ((FAIL++))
    fi
else
    echo "SKIP - Hook not executable"
    ((FAIL++))
fi

# Test 6: Blocks migration files
echo -n "Test 6: Blocks migration files... "
if [[ -x "$HOOK" ]]; then
    OUTPUT=$("$HOOK" '{"file_path": "drizzle/migrations/0001.sql"}' 2>&1)
    if [[ $? -eq 2 ]]; then
        echo "PASS"
        ((PASS++))
    else
        echo "FAIL - Should block migration files"
        ((FAIL++))
    fi
else
    echo "SKIP - Hook not executable"
    ((FAIL++))
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [[ $FAIL -gt 0 ]]; then
    exit 1
else
    exit 0
fi
