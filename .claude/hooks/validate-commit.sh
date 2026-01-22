#!/bin/bash
# Validate that tests and lint pass before allowing git commits
# Uses exit code 2 to BLOCK commits until issues are fixed
#
# Exit codes:
#   0 = Success (allow commit)
#   2 = Blocking error (Claude must fix before proceeding)

COMMAND="${CLAUDE_TOOL_INPUT:-$CLAUDE_BASH_COMMAND}"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Only validate git commit commands
if [[ ! "$COMMAND" =~ "git commit" ]] && [[ ! "$COMMAND" =~ "git add" ]]; then
  exit 0
fi

# For git add, just exit (we validate at commit time)
if [[ "$COMMAND" =~ "git add" ]] && [[ ! "$COMMAND" =~ "git commit" ]]; then
  exit 0
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║          🔒 MANDATORY PRE-COMMIT VALIDATION                   ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

cd "$PROJECT_DIR"

# Track failures
FAILURES=()
OUTPUTS=""

# Run lint check first (fastest)
echo "📋 [1/3] Running lint check..."
LINT_OUTPUT=$(bun lint 2>&1)
LINT_EXIT=$?
if [[ $LINT_EXIT -ne 0 ]]; then
  FAILURES+=("lint")
  OUTPUTS+="
--- LINT ERRORS ---
$LINT_OUTPUT
"
  echo "   ❌ Lint check FAILED"
else
  echo "   ✅ Lint check passed"
fi

# Run type check
echo "📋 [2/3] Running type check..."
TYPE_OUTPUT=$(bun typecheck 2>&1)
TYPE_EXIT=$?
if [[ $TYPE_EXIT -ne 0 ]]; then
  FAILURES+=("typecheck")
  OUTPUTS+="
--- TYPE ERRORS ---
$TYPE_OUTPUT
"
  echo "   ❌ Type check FAILED"
else
  echo "   ✅ Type check passed"
fi

# Run tests (via turbo for proper test runner)
echo "🧪 [3/3] Running tests..."
TEST_OUTPUT=$(timeout 300 bun run test 2>&1)
TEST_EXIT=$?
if [[ $TEST_EXIT -ne 0 ]]; then
  FAILURES+=("tests")
  # Only include relevant test output (last 50 lines)
  OUTPUTS+="
--- TEST FAILURES ---
$(echo "$TEST_OUTPUT" | tail -50)
"
  echo "   ❌ Tests FAILED"
else
  echo "   ✅ Tests passed"
fi

# Report results
echo ""
if [[ ${#FAILURES[@]} -gt 0 ]]; then
  echo "╔═══════════════════════════════════════════════════════════════╗"
  echo "║  ❌ COMMIT BLOCKED - VALIDATION FAILED                        ║"
  echo "╠═══════════════════════════════════════════════════════════════╣"
  echo "║  Failed checks: ${FAILURES[*]}"
  echo "╚═══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "You MUST fix these issues before committing:"
  echo "$OUTPUTS"
  echo ""
  echo "Commands to debug individually:"
  for failure in "${FAILURES[@]}"; do
    case $failure in
      lint) echo "  bun lint" ;;
      typecheck) echo "  bun typecheck" ;;
      tests) echo "  bun test" ;;
    esac
  done
  echo ""
  # Exit 2 = blocking error that Claude MUST address
  exit 2
fi

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  ✅ ALL CHECKS PASSED - COMMIT ALLOWED                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
exit 0
