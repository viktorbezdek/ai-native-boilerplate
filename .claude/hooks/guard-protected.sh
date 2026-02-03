#!/usr/bin/env bash
# Protected file guard hook
# Blocks edits to sensitive files
# Exit codes: 0 = allow, 2 = block (with message)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

INPUT="$1"

# Extract file_path from JSON input
FILE_PATH=$(echo "$INPUT" | grep -oP '"file_path"\s*:\s*"\K[^"]+' 2>/dev/null || echo "$INPUT")

# Protected patterns (blocked)
PROTECTED_PATTERNS=(
    '\.env$'
    '\.env\.'
    '\.key$'
    '\.pem$'
    '\.p12$'
    '\.pfx$'
    'credentials'
    'secrets'
    '/migrations/'
    '\.lock$'
    '/tokens/'
    '\.token$'
    '\.mcp\.json$'
    'google-oauth'
    'api[_-]token'
    'access[_-]token'
)

# Check if file matches any protected pattern
for pattern in "${PROTECTED_PATTERNS[@]}"; do
    if echo "$FILE_PATH" | grep -qEi "$pattern"; then
        echo "BLOCKED: Cannot edit protected file: $FILE_PATH"
        echo "Pattern matched: $pattern"
        echo "To modify protected files, get explicit user permission first."
        exit 2
    fi
done

# File is not protected, allow edit
exit 0
