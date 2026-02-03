#!/usr/bin/env bash
# validate_env.sh - Validate that the PWI environment is correctly configured.
# Exit 0 if all required checks pass, exit 1 if any required check fails.

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Counters
pass_count=0
warn_count=0
fail_count=0

# Collect results for the summary
results=()

pass_check() {
  results+=("PASS: $1")
  ((pass_count++))
}

warn_check() {
  results+=("WARN: $1")
  ((warn_count++))
}

fail_check() {
  results+=("FAIL: $1")
  ((fail_count++))
}

separator() {
  echo "------------------------------------------------------------"
}

echo "============================================================"
echo "  PWI Environment Validation"
echo "============================================================"
echo ""

# ---------------------------------------------------------------
# 1. Check .env file
# ---------------------------------------------------------------
echo "[1/11] Checking .env file..."
if [[ -f "$PROJECT_ROOT/.env" ]]; then
  pass_check ".env file exists"
else
  warn_check ".env file not found - consider copying from .env.example (cp .env.example .env)"
fi

# ---------------------------------------------------------------
# 2. Source .env if it exists
# ---------------------------------------------------------------
if [[ -f "$PROJECT_ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_ROOT/.env"
  set +a
  echo "       Sourced .env"
fi

# ---------------------------------------------------------------
# 3. Check required environment variables
# ---------------------------------------------------------------
echo "[2/11] Checking required environment variables..."

required_vars=(
  GOOGLE_CREDENTIALS_PATH
  JIRA_HOST
  JIRA_EMAIL
  JIRA_API_TOKEN
  ASANA_ACCESS_TOKEN
)

for var in "${required_vars[@]}"; do
  if [[ -n "${!var:-}" ]]; then
    pass_check "Required var $var is set"
  else
    fail_check "Required var $var is not set"
  fi
done

# ---------------------------------------------------------------
# 4. Check optional environment variables
# ---------------------------------------------------------------
echo "[3/11] Checking optional environment variables..."

optional_vars=(
  SLACK_BOT_TOKEN
  IMAP_HOST
  METRICS_SPREADSHEET_ID
)

for var in "${optional_vars[@]}"; do
  if [[ -n "${!var:-}" ]]; then
    pass_check "Optional var $var is set"
  else
    warn_check "Optional var $var is not set"
  fi
done

# ---------------------------------------------------------------
# 5. Verify GOOGLE_CREDENTIALS_PATH file exists if set
# ---------------------------------------------------------------
echo "[4/11] Verifying GOOGLE_CREDENTIALS_PATH file..."
if [[ -n "${GOOGLE_CREDENTIALS_PATH:-}" ]]; then
  if [[ -f "$GOOGLE_CREDENTIALS_PATH" ]]; then
    pass_check "Google credentials file exists at $GOOGLE_CREDENTIALS_PATH"
  else
    fail_check "Google credentials file not found at $GOOGLE_CREDENTIALS_PATH"
  fi
else
  warn_check "GOOGLE_CREDENTIALS_PATH not set - skipping file check"
fi

# ---------------------------------------------------------------
# 6. Check Python version >= 3.10
# ---------------------------------------------------------------
echo "[5/11] Checking Python version..."
if command -v python3 &>/dev/null; then
  py_version="$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
  py_major="$(echo "$py_version" | cut -d. -f1)"
  py_minor="$(echo "$py_version" | cut -d. -f2)"
  if [[ "$py_major" -ge 3 && "$py_minor" -ge 10 ]]; then
    pass_check "Python version $py_version >= 3.10"
  else
    fail_check "Python version $py_version < 3.10 (need >= 3.10)"
  fi
else
  fail_check "python3 not found on PATH"
fi

# ---------------------------------------------------------------
# 7. Check required Python packages
# ---------------------------------------------------------------
echo "[6/11] Checking required Python packages..."

required_packages=(networkx scipy transformers)

for pkg in "${required_packages[@]}"; do
  if python3 -c "import $pkg" &>/dev/null; then
    pass_check "Python package '$pkg' is installed"
  else
    fail_check "Python package '$pkg' is not installed (pip install $pkg)"
  fi
done

# ---------------------------------------------------------------
# 8. Check Node.js >= 18
# ---------------------------------------------------------------
echo "[7/11] Checking Node.js version..."
if command -v node &>/dev/null; then
  node_version="$(node -v | sed 's/^v//')"
  node_major="$(echo "$node_version" | cut -d. -f1)"
  if [[ "$node_major" -ge 18 ]]; then
    pass_check "Node.js version $node_version >= 18"
  else
    fail_check "Node.js version $node_version < 18 (need >= 18)"
  fi
else
  fail_check "node not found on PATH"
fi

# ---------------------------------------------------------------
# 9. Check required directories
# ---------------------------------------------------------------
echo "[8/11] Checking required directories..."

required_dirs=(graph logs data tokens)

for dir in "${required_dirs[@]}"; do
  if [[ -d "$PROJECT_ROOT/$dir" ]]; then
    pass_check "Directory $dir/ exists"
  else
    fail_check "Directory $dir/ is missing (mkdir -p $dir)"
  fi
done

# ---------------------------------------------------------------
# 10. Verify graph/schema.json exists
# ---------------------------------------------------------------
echo "[9/11] Checking graph/schema.json..."
if [[ -f "$PROJECT_ROOT/graph/schema.json" ]]; then
  pass_check "graph/schema.json exists"
else
  fail_check "graph/schema.json is missing"
fi

# ---------------------------------------------------------------
# 11. Print summary
# ---------------------------------------------------------------
echo ""
echo "============================================================"
echo "  Validation Summary"
echo "============================================================"
separator

for entry in "${results[@]}"; do
  case "$entry" in
    PASS:*) echo "  [PASS] ${entry#PASS: }" ;;
    WARN:*) echo "  [WARN] ${entry#WARN: }" ;;
    FAIL:*) echo "  [FAIL] ${entry#FAIL: }" ;;
  esac
done

separator
echo ""
echo "  Total: $pass_count passed, $warn_count warnings, $fail_count failed"
echo ""

if [[ "$fail_count" -gt 0 ]]; then
  echo "  Result: FAILED - $fail_count required check(s) did not pass."
  echo ""
  exit 1
else
  echo "  Result: OK - all required checks passed."
  if [[ "$warn_count" -gt 0 ]]; then
    echo "  ($warn_count warning(s) - review items marked [WARN] above)"
  fi
  echo ""
  exit 0
fi
