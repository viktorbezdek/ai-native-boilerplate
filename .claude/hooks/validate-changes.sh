#!/bin/bash
# Validate code changes after file writes
# Runs lint check and BLOCKS if issues found
#
# Exit codes:
#   0 = Success
#   2 = Blocking error (Claude must fix)

TOOL_NAME="${CLAUDE_TOOL_NAME:-}"
FILE_PATH="${CLAUDE_FILE_PATH:-}"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Only validate code files
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx)
    ;;
  *.json)
    # Skip package.json and lock files
    if [[ "$FILE_PATH" =~ "package.json" ]] || [[ "$FILE_PATH" =~ "lock" ]]; then
      exit 0
    fi
    ;;
  *)
    exit 0
    ;;
esac

# Skip non-source directories
if [[ "$FILE_PATH" =~ "node_modules" ]] || \
   [[ "$FILE_PATH" =~ "dist/" ]] || \
   [[ "$FILE_PATH" =~ ".next/" ]] || \
   [[ "$FILE_PATH" =~ "coverage/" ]] || \
   [[ "$FILE_PATH" =~ ".turbo/" ]]; then
  exit 0
fi

cd "$PROJECT_DIR"

# Check if file exists (might have been deleted)
if [[ ! -f "$FILE_PATH" ]]; then
  exit 0
fi

echo "🔍 Validating: $FILE_PATH"

# Run biome check on the file
LINT_OUTPUT=$(bun biome check "$FILE_PATH" 2>&1)
LINT_EXIT=$?

if [[ $LINT_EXIT -ne 0 ]]; then
  echo ""
  echo "╔═══════════════════════════════════════════════════════════════╗"
  echo "║  ❌ LINT ERROR - FIX REQUIRED                                 ║"
  echo "╚═══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "File: $FILE_PATH"
  echo ""
  echo "$LINT_OUTPUT"
  echo ""
  echo "Fix command: bun biome check --write \"$FILE_PATH\""
  echo ""
  # Exit 2 = blocking error - Claude MUST fix before continuing
  exit 2
fi

echo "   ✅ Lint passed"

# Run TypeScript check on the file (non-blocking for speed)
# Full typecheck happens at commit time
TYPE_OUTPUT=$(bun tsc --noEmit "$FILE_PATH" 2>&1)
TYPE_EXIT=$?

if [[ $TYPE_EXIT -ne 0 ]]; then
  echo ""
  echo "╔═══════════════════════════════════════════════════════════════╗"
  echo "║  ❌ TYPE ERROR - FIX REQUIRED                                 ║"
  echo "╚═══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "File: $FILE_PATH"
  echo ""
  echo "$TYPE_OUTPUT"
  echo ""
  # Exit 2 = blocking error
  exit 2
fi

echo "   ✅ Types passed"
exit 0
