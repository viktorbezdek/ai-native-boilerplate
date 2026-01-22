#!/bin/bash
# Setup hook - runs on fresh clone or maintenance
# Triggered via: claude --init or claude --maintenance

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR"

echo "🔧 Setting up project..."

# Check if node_modules exists
if [[ ! -d "node_modules" ]]; then
  echo "📦 Installing dependencies..."
  bun install
fi

# Check if database needs setup
if [[ -f ".env" ]] || [[ -f ".env.local" ]]; then
  echo "🗄️  Checking database..."
  if ! bun db:generate 2>/dev/null; then
    echo "⚠️  Database generation failed - may need DATABASE_URL"
  fi
fi

# Ensure hooks are executable
echo "🔐 Setting hook permissions..."
chmod +x .claude/hooks/*.sh 2>/dev/null || true

# Start memory service if configured
if [[ -f ".claude/hooks/claude-mem.sh" ]]; then
  echo "🧠 Starting memory service..."
  bash .claude/hooks/claude-mem.sh start 2>/dev/null || true
fi

echo "✅ Setup complete"
exit 0
