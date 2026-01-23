#!/bin/bash
# Quality metrics tracking hook
# Captures: test results, lint status, type errors, coverage
# Triggered on: PostToolUse for Bash commands

# Don't use set -e - hooks should never block Claude's operation

LOG_DIR="$CLAUDE_PROJECT_DIR/.claude/logs"
QUALITY_FILE="$LOG_DIR/quality.jsonl"

mkdir -p "$LOG_DIR"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Parse hook context
HOOK_INPUT=$(cat)

TOOL_NAME=$(echo "$HOOK_INPUT" | jq -r '.tool_name // .toolName // "unknown"' 2>/dev/null || echo "unknown")

# Only process Bash commands
if [ "$TOOL_NAME" != "Bash" ]; then
  exit 0
fi

COMMAND=$(echo "$HOOK_INPUT" | jq -r '.tool_input.command // .input.command // ""' 2>/dev/null || echo "")
RESULT=$(echo "$HOOK_INPUT" | jq -r '.tool_result // .result // ""' 2>/dev/null || echo "")
EXIT_CODE=$(echo "$HOOK_INPUT" | jq -r '.exit_code // 0' 2>/dev/null || echo "0")

# Detect command type and extract metrics
METRIC_TYPE=""
METRIC_DATA="{}"

# Test commands
if echo "$COMMAND" | grep -qE "(vitest|jest|bun test|npm test|yarn test|playwright)" 2>/dev/null; then
  METRIC_TYPE="test"

  # Extract test counts from common patterns (vitest, jest, bun test)
  # Vitest: "5 passed" or "Tests  5 passed" or "✓ 5 tests"
  # Bun: "5 pass" or "pass 5"
  # Jest: "5 passed, 2 failed"

  # Try "X passed" or "X pass" pattern (vitest/bun)
  TESTS_PASSED=$(echo "$RESULT" | grep -oE "[0-9]+ (pass|passed|passing)" | grep -oE "[0-9]+" | head -1)
  # Try "Tests  X passed" (Vitest summary line)
  [ -z "$TESTS_PASSED" ] && TESTS_PASSED=$(echo "$RESULT" | grep -oE "Tests[[:space:]]+[0-9]+" | grep -oE "[0-9]+" | head -1)
  # Try "Test Files  X passed" (Vitest)
  [ -z "$TESTS_PASSED" ] && TESTS_PASSED=$(echo "$RESULT" | grep -oE "Test Files[^0-9]*[0-9]+" | grep -oE "[0-9]+" | head -1)
  # Turborepo: count "✓" symbols for passed tests
  [ -z "$TESTS_PASSED" ] && TESTS_PASSED=$(echo "$RESULT" | grep -c "✓" 2>/dev/null || echo "0")
  [ -z "$TESTS_PASSED" ] && TESTS_PASSED="0"

  # Extract failed count - "X fail" or "X failed"
  TESTS_FAILED=$(echo "$RESULT" | grep -oE "[0-9]+ (fail|failed|failing)" | grep -oE "[0-9]+" | head -1)
  # Try counting "✗" or "×" symbols
  [ -z "$TESTS_FAILED" ] && TESTS_FAILED=$(echo "$RESULT" | grep -cE "(✗|×|FAIL)" 2>/dev/null || echo "0")
  [ -z "$TESTS_FAILED" ] && TESTS_FAILED="0"

  # Extract skipped count
  TESTS_SKIPPED=$(echo "$RESULT" | grep -oE "[0-9]+ (skip|skipped|pending|todo)" | grep -oE "[0-9]+" | head -1)
  [ -z "$TESTS_SKIPPED" ] && TESTS_SKIPPED=$(echo "$RESULT" | grep -oE "(skipped|pending|todo)[^0-9]*[0-9]+" | grep -oE "[0-9]+" | head -1)
  [ -z "$TESTS_SKIPPED" ] && TESTS_SKIPPED="0"

  # Extract coverage if present
  # Try "XX.XX% Stmts" or "Coverage: XX%" or "All files | XX%"
  COVERAGE=$(echo "$RESULT" | grep -oE "[0-9]+\.?[0-9]*%[^a-zA-Z]*(Stmts|coverage|cov|Coverage)" | grep -oE "[0-9]+\.?[0-9]*" | head -1)
  [ -z "$COVERAGE" ] && COVERAGE=$(echo "$RESULT" | grep -oE "All files[^0-9]*[0-9]+\.?[0-9]*" | grep -oE "[0-9]+\.?[0-9]*" | head -1)
  [ -z "$COVERAGE" ] && COVERAGE=$(echo "$RESULT" | grep -oE "(coverage|Coverage)[^0-9]*[0-9]+\.?[0-9]*" | grep -oE "[0-9]+\.?[0-9]*" | head -1)
  [ -z "$COVERAGE" ] && COVERAGE="0"

  METRIC_DATA=$(jq -n \
    --argjson passed "${TESTS_PASSED:-0}" \
    --argjson failed "${TESTS_FAILED:-0}" \
    --argjson skipped "${TESTS_SKIPPED:-0}" \
    --argjson coverage "${COVERAGE:-0}" \
    --argjson exit "$EXIT_CODE" \
    '{
      passed: $passed,
      failed: $failed,
      skipped: $skipped,
      coverage_pct: $coverage,
      success: ($exit == 0)
    }')

# Lint commands
elif echo "$COMMAND" | grep -qE "(biome|eslint|prettier|lint)" 2>/dev/null; then
  METRIC_TYPE="lint"

  # Extract error/warning counts
  ERRORS=$(echo "$RESULT" | grep -oE "[0-9]+ error" | grep -oE "[0-9]+" | head -1 || echo "0")
  WARNINGS=$(echo "$RESULT" | grep -oE "[0-9]+ warning" | grep -oE "[0-9]+" | head -1 || echo "0")

  METRIC_DATA=$(jq -n \
    --argjson errors "${ERRORS:-0}" \
    --argjson warnings "${WARNINGS:-0}" \
    --argjson exit "$EXIT_CODE" \
    '{
      errors: $errors,
      warnings: $warnings,
      success: ($exit == 0)
    }')

# TypeScript/type check commands
elif echo "$COMMAND" | grep -qE "(tsc|typecheck|type-check)" 2>/dev/null; then
  METRIC_TYPE="typecheck"

  # Count type errors
  TYPE_ERRORS=$(echo "$RESULT" | grep -cE "error TS[0-9]+" || echo "0")

  METRIC_DATA=$(jq -n \
    --argjson errors "${TYPE_ERRORS:-0}" \
    --argjson exit "$EXIT_CODE" \
    '{
      type_errors: $errors,
      success: ($exit == 0)
    }')

# Build commands
elif echo "$COMMAND" | grep -qE "(build|next build|vite build)" 2>/dev/null; then
  METRIC_TYPE="build"

  # Extract build time if present
  BUILD_TIME=$(echo "$RESULT" | grep -oE "([0-9.]+)\s*(s|ms|seconds)" | grep -oE "[0-9.]+" | head -1 || echo "0")

  METRIC_DATA=$(jq -n \
    --argjson time "${BUILD_TIME:-0}" \
    --argjson exit "$EXIT_CODE" \
    '{
      build_time_s: $time,
      success: ($exit == 0)
    }')

# Git commands
elif echo "$COMMAND" | grep -qE "^git (commit|push|pull|merge)" 2>/dev/null; then
  METRIC_TYPE="git"

  METRIC_DATA=$(jq -n \
    --arg cmd "$COMMAND" \
    --argjson exit "$EXIT_CODE" \
    '{
      command: $cmd,
      success: ($exit == 0)
    }')
fi

# Only log if we identified a quality-relevant command
if [ -n "$METRIC_TYPE" ]; then
  QUALITY_ENTRY=$(jq -n \
    --arg ts "$TIMESTAMP" \
    --arg type "$METRIC_TYPE" \
    --arg cmd "$COMMAND" \
    --argjson data "$METRIC_DATA" \
    '{
      timestamp: $ts,
      type: $type,
      command: ($cmd | split("\n")[0] | .[0:200]),
      metrics: $data
    }')

  echo "$QUALITY_ENTRY" >> "$QUALITY_FILE"
fi

# Rotate log (keep last 2000 entries)
if [ -f "$QUALITY_FILE" ]; then
  LINES=$(wc -l < "$QUALITY_FILE" | tr -d ' ')
  if [ "$LINES" -gt 2000 ]; then
    tail -n 2000 "$QUALITY_FILE" > "$QUALITY_FILE.tmp"
    mv "$QUALITY_FILE.tmp" "$QUALITY_FILE"
  fi
fi

exit 0
