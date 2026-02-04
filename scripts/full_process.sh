#!/usr/bin/env bash
# PWI Full Process - Complete knowledge graph rebuild with 20-skill deep analysis
# Run weekly via cron: 0 3 * * 0
# Executes all 20 skills in optimized parallel/sequential phases

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"
GRAPH_DIR="$PROJECT_DIR/graph"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$LOG_DIR/full_process_$TIMESTAMP.json"
SUMMARY_FILE="$LOG_DIR/full_process_$TIMESTAMP.summary"

cd "$PROJECT_DIR"

# Ensure directories exist
mkdir -p "$LOG_DIR" "$GRAPH_DIR/nodes" "$GRAPH_DIR/edges"

log() {
    echo "[$(date -Iseconds)] $1"
}

log "Starting full-process (20-skill deep analysis)..."
log "Log file: $LOG_FILE"

# Pre-flight checks
if [[ ! -f ".mcp.json" ]]; then
    log "WARNING: .mcp.json not found, MCP servers may not be configured"
fi

if [[ ! -d ".claude/skills" ]]; then
    log "ERROR: Skills directory not found"
    exit 1
fi

# Count available skills
SKILL_COUNT=$(find .claude/skills -name "SKILL.md" 2>/dev/null | wc -l)
log "Found $SKILL_COUNT skills configured"

# Run Claude with the full process prompt
# Using --print to see real-time output while also capturing JSON
log "Invoking Claude for full-process execution..."

claude -p "@$SCRIPT_DIR/full_process_prompt.txt" \
    --output-format json \
    --allowedTools "Read,Write,Edit,Bash,Glob,Grep,Task,TodoWrite,AskUserQuestion,WebFetch" \
    > "$LOG_FILE" 2>&1 &

CLAUDE_PID=$!

# Monitor progress (optional - check log every 30s)
while kill -0 $CLAUDE_PID 2>/dev/null; do
    sleep 30
    if [[ -f "$LOG_FILE" ]]; then
        LAST_PHASE=$(grep -o '"phase":[^,}]*' "$LOG_FILE" 2>/dev/null | tail -1 || echo "initializing")
        log "Progress: $LAST_PHASE"
    fi
done

wait $CLAUDE_PID
EXIT_CODE=$?

# Extract summary from log
if [[ -f "$LOG_FILE" ]]; then
    # Try to extract summary JSON
    grep -o '"summary":{[^}]*}' "$LOG_FILE" > "$SUMMARY_FILE" 2>/dev/null || true
fi

if [[ $EXIT_CODE -eq 0 ]]; then
    log "Full process completed successfully"

    # Extract key metrics if available
    if [[ -f "$SUMMARY_FILE" ]] && [[ -s "$SUMMARY_FILE" ]]; then
        log "Summary: $(cat "$SUMMARY_FILE")"
    fi

    # Send success notification for high-priority findings
    FINDINGS=$(grep -c '"severity":"high"' "$LOG_FILE" 2>/dev/null || echo "0")
    if [[ "$FINDINGS" -gt 0 ]]; then
        log "Found $FINDINGS high-severity items - notification sent"
        if [[ -x "$PROJECT_DIR/.claude/skills/notify/notify.sh" ]]; then
            "$PROJECT_DIR/.claude/skills/notify/notify.sh" \
                "PWI Complete" \
                "$FINDINGS high-priority items need attention" \
                "View Report,Dismiss" \
                "high"
        fi
    fi
else
    log "Full process failed with exit code $EXIT_CODE"
    log "Check log: $LOG_FILE"

    # Send failure notification
    if [[ -x "$PROJECT_DIR/.claude/skills/notify/notify.sh" ]]; then
        "$PROJECT_DIR/.claude/skills/notify/notify.sh" \
            "PWI Error" \
            "Full process failed. Check logs." \
            "View Log,Dismiss" \
            "high"
    fi
fi

# Cleanup old logs (keep last 30 days)
find "$LOG_DIR" -name "full_process_*.json" -mtime +30 -delete 2>/dev/null || true
find "$LOG_DIR" -name "full_process_*.summary" -mtime +30 -delete 2>/dev/null || true

log "Full process finished"
exit $EXIT_CODE
