#!/usr/bin/env bash
# Logs bash commands for audit trail
# Called after Bash operations

INPUT="$1"
OUTPUT="$2"
LOG_FILE="logs/commands.jsonl"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Extract command
COMMAND=$(echo "$INPUT" | grep -oP '"command"\s*:\s*"\K[^"]+' 2>/dev/null || echo "unknown")

# Truncate command for logging
COMMAND_SHORT="${COMMAND:0:200}"

# Log entry
echo "{\"timestamp\": \"$(date -Iseconds)\", \"type\": \"bash_command\", \"command\": \"$COMMAND_SHORT\"}" >> "$LOG_FILE"

exit 0
