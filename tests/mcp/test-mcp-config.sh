#!/usr/bin/env bash
# TDD test for .mcp.json configuration
# Verifies MCP server configuration exists and is valid

MCP_CONFIG=".mcp.json"
PASS=0
FAIL=0

echo "=== Testing .mcp.json ==="

# Test 1: File exists
echo -n "Test 1: .mcp.json exists... "
if [[ -f "$MCP_CONFIG" ]]; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL - .mcp.json not found"
    ((FAIL++))
fi

# Test 2: Valid JSON
echo -n "Test 2: Valid JSON format... "
if [[ -f "$MCP_CONFIG" ]] && python3 -m json.tool "$MCP_CONFIG" > /dev/null 2>&1; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL - Invalid JSON"
    ((FAIL++))
fi

# Test 3: Has mcpServers section
echo -n "Test 3: Has mcpServers section... "
if [[ -f "$MCP_CONFIG" ]] && grep -q '"mcpServers"' "$MCP_CONFIG"; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL - Missing mcpServers section"
    ((FAIL++))
fi

# Test 4: Has at least one server configured
echo -n "Test 4: Has at least one server... "
if [[ -f "$MCP_CONFIG" ]] && python3 -c "
import json
with open('$MCP_CONFIG') as f:
    config = json.load(f)
    servers = config.get('mcpServers', {})
    exit(0 if len(servers) > 0 else 1)
" 2>/dev/null; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL - No servers configured"
    ((FAIL++))
fi

# Test 5: Servers have command field
echo -n "Test 5: Servers have command field... "
if [[ -f "$MCP_CONFIG" ]] && python3 -c "
import json
with open('$MCP_CONFIG') as f:
    config = json.load(f)
    servers = config.get('mcpServers', {})
    for name, server in servers.items():
        if 'command' not in server:
            exit(1)
    exit(0)
" 2>/dev/null; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL - Server missing command field"
    ((FAIL++))
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [[ $FAIL -gt 0 ]]; then
    exit 1
else
    exit 0
fi
