#!/usr/bin/env bash
# Logs file changes for audit trail
# Called after Edit/Write operations

INPUT="$1"
OUTPUT="$2"
LOG_FILE="logs/changes.jsonl"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Extract file path
FILE_PATH=$(echo "$INPUT" | grep -oP '"file_path"\s*:\s*"\K[^"]+' 2>/dev/null || echo "unknown")

# Log entry
echo "{\"timestamp\": \"$(date -Iseconds)\", \"type\": \"file_change\", \"file\": \"$FILE_PATH\"}" >> "$LOG_FILE"

exit 0
