#!/usr/bin/env bash
# PWI Cron Setup Script
# Sets up scheduled execution for full-process and update

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== PWI Cron Setup ==="
echo "Project directory: $PROJECT_DIR"
echo ""

# Make scripts executable
chmod +x "$SCRIPT_DIR/full_process.sh"
chmod +x "$SCRIPT_DIR/update.sh"

# Generate cron entries
FULL_PROCESS_CRON="0 3 * * 0 $SCRIPT_DIR/full_process.sh >> $PROJECT_DIR/logs/cron.log 2>&1"
UPDATE_CRON="0 7 * * * $SCRIPT_DIR/update.sh >> $PROJECT_DIR/logs/cron.log 2>&1"

echo "Proposed cron entries:"
echo ""
echo "# PWI Full Process - Weekly (Sunday 3 AM)"
echo "$FULL_PROCESS_CRON"
echo ""
echo "# PWI Update - Daily (7 AM)"
echo "$UPDATE_CRON"
echo ""

# Ask user how to proceed
echo "Options:"
echo "  1. Install to crontab automatically"
echo "  2. Show commands to install manually"
echo "  3. Exit without installing"
echo ""
read -p "Choose option [1-3]: " CHOICE

case "$CHOICE" in
    1)
        # Backup existing crontab
        crontab -l > /tmp/crontab_backup_$(date +%Y%m%d).txt 2>/dev/null || true
        echo "Existing crontab backed up to /tmp/crontab_backup_$(date +%Y%m%d).txt"

        # Add new entries
        (crontab -l 2>/dev/null | grep -v "PWI"; echo ""; echo "# PWI Full Process - Weekly (Sunday 3 AM)"; echo "$FULL_PROCESS_CRON"; echo "# PWI Update - Daily (7 AM)"; echo "$UPDATE_CRON") | crontab -

        echo ""
        echo "✅ Cron entries installed!"
        echo ""
        echo "Verify with: crontab -l"
        ;;
    2)
        echo ""
        echo "Run these commands to install manually:"
        echo ""
        echo "  crontab -e"
        echo ""
        echo "Then add these lines:"
        echo ""
        echo "  # PWI Full Process - Weekly (Sunday 3 AM)"
        echo "  $FULL_PROCESS_CRON"
        echo ""
        echo "  # PWI Update - Daily (7 AM)"
        echo "  $UPDATE_CRON"
        ;;
    3)
        echo "Exiting without installing."
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "=== Setup Complete ==="
echo ""
echo "To test manually:"
echo "  $SCRIPT_DIR/update.sh        # Quick test"
echo "  $SCRIPT_DIR/full_process.sh  # Full rebuild"
echo ""
echo "Logs will be written to: $PROJECT_DIR/logs/"
