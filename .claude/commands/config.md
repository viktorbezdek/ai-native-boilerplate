# /config - Workflow Configuration

Get or set workflow configuration values.

## Usage
```
/config <key> [value]
```

## Arguments
- `key` (required): Configuration key to get or set
- `value` (optional): New value to set. If omitted, displays current value.

## Configuration Keys

### Execution Mode
- `mode`: Execution mode (supervised, autonomous-low, autonomous-high, full-auto)
- `approval_level`: Auto-approval level (none, low, medium, high)

### Resource Limits
- `budget`: Maximum cost allowed (e.g., "50 USD")
- `timeout`: Maximum execution time in minutes
- `max_retries`: Maximum retry attempts per task

### Checkpoints
- `checkpoint_interval`: Tasks between checkpoints
- `backup_paths`: Paths to include in backups

### Agents
- `max_agents`: Maximum concurrent agents per type
- `idle_timeout`: Agent idle timeout in seconds

## Options
- `--list`: List all configuration keys and values
- `--reset`: Reset to default values
- `--workflow <id>`: Configure specific workflow

## Example

```bash
# Get current mode
/config mode

# Set mode
/config mode autonomous-low

# Set budget
/config budget "100 USD"

# List all config
/config --list

# Reset to defaults
/config --reset
```

## Output

```bash
# Getting a value
> /config mode
mode = autonomous-low

# Setting a value
> /config budget "100 USD"
budget set to: 100 USD

# Listing all
> /config --list
Configuration:
━━━━━━━━━━━━━━━━━━━━━━━━━━

Execution:
  mode              = autonomous-low
  approval_level    = low

Resources:
  budget            = 100 USD
  timeout           = 60 minutes
  max_retries       = 3

Checkpoints:
  checkpoint_interval = 5 tasks
  backup_paths        = ["src", "tests"]

Agents:
  max_agents        = 5
  idle_timeout      = 300 seconds
```

## Related Commands
- `/approve` - Set approval level
- `/budget` - Set cost ceiling
- `/timeout` - Set time limit
