#!/usr/bin/env bash
# Validates bash commands before execution
# Exit codes: 0 = allow, 2 = block

INPUT="$1"

# Extract command from JSON input
COMMAND=$(echo "$INPUT" | grep -oP '"command"\s*:\s*"\K[^"]+' 2>/dev/null || echo "$INPUT")

# Dangerous patterns to block
DANGEROUS_PATTERNS=(
    'rm -rf /'
    'rm -rf ~'
    ':(){:|:&};:'
    'mkfs\.'
    'dd if=/dev/zero'
    '> /dev/sda'
    'chmod -R 777 /'
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
    if echo "$COMMAND" | grep -qF "$pattern"; then
        echo "BLOCKED: Dangerous command detected: $pattern"
        exit 2
    fi
done

exit 0
