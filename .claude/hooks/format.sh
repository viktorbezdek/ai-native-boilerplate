#!/bin/bash
# Auto-format files after write/edit
# Uses Biome for JS/TS/JSON, keeps others as-is

FILE="$CLAUDE_FILE_PATH"
EXT="${FILE##*.}"

# Only format supported file types
case "$EXT" in
  js|jsx|ts|tsx|json|jsonc)
    # Use Biome for JavaScript/TypeScript/JSON
    if command -v bunx &> /dev/null; then
      bunx biome format --write "$FILE" 2>/dev/null || true
    elif command -v npx &> /dev/null; then
      npx biome format --write "$FILE" 2>/dev/null || true
    fi
    ;;
  css)
    # Tailwind CSS files - no additional formatting needed
    # Biome doesn't support CSS yet
    ;;
  md|mdx)
    # Markdown - preserve as-is for now
    ;;
  *)
    # Unknown extension - skip formatting
    ;;
esac

exit 0
