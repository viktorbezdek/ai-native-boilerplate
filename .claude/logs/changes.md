# Configuration Change Log

## 2026-01-23 (Latest)

### biome-config/biome.json
- **Changed**: Switched from exclude patterns to explicit include patterns
- **Reason**: Lint was checking 244 files including .claude/, taking 43 minutes
- **Before**: `"includes": ["**", "!**/node_modules", ...]` - broad match with exclusions
- **After**: `"includes": ["apps/**/*.ts", "packages/**/*.ts", "scripts/**/*.ts"]` - explicit source paths
- **Impact**: Lint reduced from 2591s to 34ms (99.99% faster), 6994 errors → 1 warning

---

## 2026-01-23

### track-drift.sh
- **Changed**: Added session-level deduplication using cache file
- **Reason**: 500 drift events logged, mostly duplicates for same files
- **Impact**: Expected ~80% reduction in drift log entries

### track-quality.sh
- **Changed**: Improved test metrics regex patterns
- **Reason**: Quality.jsonl showing 0 passed/0 failed despite tests running
- **Impact**: Accurate test pass/fail tracking for Vitest/Bun/Turborepo output

### settings.json
- **Changed**: Removed telemetry.sh from PreToolUse hooks
- **Reason**: Telemetry was running on both PreToolUse and PostToolUse (duplicate logging)
- **Impact**: ~50% reduction in telemetry log entries

### Skills archived
- **Changed**: Moved 5 low-usage skills to `.claude/skills/archived/`
- **Skills**: architecture-advisor, compliance-checker, cost-optimizer, vulnerability-scanner, workflow-debugger
- **Reason**: 0% activation rate over analysis period
- **Impact**: Cleaner skill list (22 active skills down from 27)

---

## Previous Changes

### 2026-01-23 (Earlier)
- Removed 18 marketing skills (copywriting, SEO, etc.)
- Skills reduced from 46 to 27 (41% reduction)

### 2026-01-22
- Added CI/CD pipelines and code-review skills
- Fixed hook reliability issues
- Added drift deduplication (initial version)
