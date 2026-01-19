#!/bin/bash
# Guard protected files from modification
# Blocks writes to sensitive files

FILE="$CLAUDE_FILE_PATH"

# Protected file patterns
PROTECTED_PATTERNS=(
  ".env"
  ".env.*"
  "*.pem"
  "*.key"
  "*.cert"
  "secrets/*"
  "drizzle/migrations/*"
  "node_modules/*"
  ".git/*"
  "bun.lockb"
)

# Get relative path from project root
RELATIVE_PATH="${FILE#$CLAUDE_PROJECT_DIR/}"

for pattern in "${PROTECTED_PATTERNS[@]}"; do
  # Use bash pattern matching
  if [[ "$RELATIVE_PATH" == $pattern ]]; then
    echo "❌ BLOCKED: Cannot modify protected file"
    echo "   File: $RELATIVE_PATH"
    echo "   Pattern: $pattern"
    echo ""
    echo "Protected files include:"
    echo "  - Environment files (.env*)"
    echo "  - Security credentials (*.pem, *.key)"
    echo "  - Applied migrations (drizzle/migrations/*)"
    echo "  - Dependencies (node_modules/*)"
    echo ""
    echo "Modify these files manually if needed."
    exit 1
  fi
done

exit 0
