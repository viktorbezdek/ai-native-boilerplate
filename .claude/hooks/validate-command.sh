#!/bin/bash
# Validate bash commands before execution
# Blocks dangerous operations

COMMAND="$CLAUDE_BASH_COMMAND"

# Dangerous patterns to block
DANGEROUS_PATTERNS=(
  "rm -rf /"
  "rm -rf /*"
  "rm -rf ~"
  "> /dev/sda"
  "mkfs."
  "dd if="
  "DROP DATABASE"
  "DELETE FROM .* WHERE 1"
  "TRUNCATE TABLE"
  "npm publish"
  "bun publish"
  "git push.*--force"
  "git push.*-f"
  "chmod -R 777"
  "curl.*| sh"
  "curl.*| bash"
  "wget.*| sh"
  "wget.*| bash"
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if [[ "$COMMAND" =~ $pattern ]]; then
    echo "❌ BLOCKED: Potentially dangerous command detected"
    echo "   Pattern: $pattern"
    echo "   Command: $COMMAND"
    echo ""
    echo "If this is intentional, run the command manually."
    exit 1
  fi
done

# Warn about production database operations
if [[ "$COMMAND" =~ "DATABASE_URL" ]] && [[ "$COMMAND" =~ "prod" ]]; then
  echo "⚠️  WARNING: Command appears to target production database"
  echo "   Please verify this is intentional."
fi

exit 0
