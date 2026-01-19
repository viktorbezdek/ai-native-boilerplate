#!/bin/bash
# PostToolUse hook: Run relevant tests after file modifications
# Triggered by: Write, Edit operations on source files

FILE="$CLAUDE_FILE_PATH"

# Skip if not a source file
if [[ ! "$FILE" =~ \.(ts|tsx)$ ]]; then
  exit 0
fi

# Skip if it's a test file itself
if [[ "$FILE" =~ \.(test|spec)\.(ts|tsx)$ ]]; then
  # Run the test file directly
  echo "Running test file: $FILE"
  bun test "$FILE" --passWithNoTests 2>/dev/null
  exit $?
fi

# Skip non-src files
if [[ ! "$FILE" =~ ^src/ ]] && [[ ! "$FILE" =~ ^./src/ ]]; then
  exit 0
fi

# Find related test file
TEST_FILE=""

# Pattern 1: src/lib/utils.ts -> tests/unit/lib/utils.test.ts
if [[ "$FILE" =~ ^(\.\/)?src/lib/(.+)\.ts$ ]]; then
  RELATIVE="${BASH_REMATCH[2]}"
  TEST_FILE="tests/unit/lib/${RELATIVE}.test.ts"
fi

# Pattern 2: src/app/.../route.ts -> tests/integration/api/...
if [[ "$FILE" =~ ^(\.\/)?src/app/api/(.+)/route\.ts$ ]]; then
  RELATIVE="${BASH_REMATCH[2]}"
  TEST_FILE="tests/integration/api/${RELATIVE}.test.ts"
fi

# Pattern 3: src/components/.../component.tsx -> tests/unit/components/...
if [[ "$FILE" =~ ^(\.\/)?src/components/(.+)\.tsx$ ]]; then
  RELATIVE="${BASH_REMATCH[2]}"
  TEST_FILE="tests/unit/components/${RELATIVE}.test.tsx"
fi

# Run test if found
if [[ -n "$TEST_FILE" ]] && [[ -f "$TEST_FILE" ]]; then
  echo "Running related test: $TEST_FILE"
  bun test "$TEST_FILE" --passWithNoTests 2>/dev/null
  
  # Capture exit code but don't fail the hook
  # (We want to report failures, not block the write)
  TEST_EXIT=$?
  if [[ $TEST_EXIT -ne 0 ]]; then
    echo "⚠️  Test failed: $TEST_FILE"
    echo "   Review test output and fix before committing."
  fi
else
  # No specific test file found, run tests for the directory
  DIR=$(dirname "$FILE")
  echo "No specific test found. Running tests for: $DIR"
  bun test --passWithNoTests 2>/dev/null
fi

# Always exit 0 to not block writes
# Test failures are reported but don't prevent file operations
exit 0
