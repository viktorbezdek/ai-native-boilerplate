#!/usr/bin/env bash
# Claude-Mem Project-Level Integration
# This script wraps claude-mem commands for project-scoped memory storage

set -e

# Project paths
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
CLAUDE_MEM_DIR="$PROJECT_DIR/packages/claude-mem"
MEMORY_DIR="$PROJECT_DIR/.claude/memory"
PLUGIN_ROOT="$CLAUDE_MEM_DIR/plugin"

# Environment for project-level storage
export CLAUDE_MEM_DATA_DIR="$MEMORY_DIR"
export CLAUDE_MEM_CONFIG="$MEMORY_DIR/settings.json"
export CLAUDE_MEM_DB="$MEMORY_DIR/claude-mem.db"
export CLAUDE_MEM_PORT=37778
export CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT"

# Action from argument
ACTION="${1:-}"
HOOK_TYPE="${2:-}"
HOOK_EVENT="${3:-}"

case "$ACTION" in
  start)
    # Start worker service with project-level config
    if command -v bun &> /dev/null; then
      bun "$PLUGIN_ROOT/scripts/worker-service.cjs" start 2>/dev/null || true
    fi
    ;;
  stop)
    # Stop worker service
    if command -v bun &> /dev/null; then
      bun "$PLUGIN_ROOT/scripts/worker-service.cjs" stop 2>/dev/null || true
    fi
    ;;
  hook)
    # Forward hook to worker service
    if command -v bun &> /dev/null; then
      bun "$PLUGIN_ROOT/scripts/worker-service.cjs" hook "$HOOK_TYPE" "$HOOK_EVENT" 2>/dev/null || true
    fi
    ;;
  status)
    # Check worker status
    if command -v bun &> /dev/null; then
      bun "$PLUGIN_ROOT/scripts/worker-service.cjs" status 2>/dev/null || echo "Worker not running"
    fi
    ;;
  *)
    echo "Usage: claude-mem.sh {start|stop|hook|status}"
    exit 1
    ;;
esac

exit 0
