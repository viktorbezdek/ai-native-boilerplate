"""System health checker for the PWI platform.

Performs structural and runtime health checks across all PWI components:
skills directory, knowledge graph database, MCP configuration, hook scripts,
log directory, and required environment variables.

Each individual check returns a standardised result dictionary::

    {"status": "ok|warn|error", "message": str, "details": dict}

The :meth:`HealthCheck.check_all` method aggregates every check into a single
report and computes an overall status (the worst status among all checks).
"""

from __future__ import annotations

import json
import os
import re
import sqlite3
import stat
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Expected skill directories (from CLAUDE.md specification)
# ---------------------------------------------------------------------------

EXPECTED_SKILLS: list[str] = [
    "stale-detection",
    "misalignment-check",
    "reply-suggestion",
    "sentiment-analysis",
    "morale-forecasting",
    "blocker-identification",
    "action-item-extraction",
    "trend-detection",
    "context-query",
    "entity-reconciliation",
    "inference-engine",
    "knowledge-gap-filler",
    "semantic-enrichment",
    "ripple-effect-simulation",
    "what-if-analysis",
    "graph-visualization",
    "expertise-mapping",
    "echo-chamber-detection",
    "innovation-opportunity-spotting",
    "self-improvement-loop",
]

# Fetch skills -- optional but worth checking
FETCH_SKILLS: list[str] = [
    "fetch-google-chat",
    "fetch-calendar",
    "fetch-jira",
    "fetch-asana",
    "fetch-sheets",
]

# Required env vars from .env.example
REQUIRED_ENV_VARS: list[str] = [
    "GOOGLE_CREDENTIALS_PATH",
    "JIRA_API_TOKEN",
    "ASANA_ACCESS_TOKEN",
]

# Optional but recommended env vars
OPTIONAL_ENV_VARS: list[str] = [
    "GOOGLE_TOKEN_PATH",
    "JIRA_HOST",
    "JIRA_EMAIL",
    "ASANA_WORKSPACE_GID",
    "PWI_GRAPH_DB_PATH",
    "PWI_LOG_LEVEL",
]

# YAML frontmatter regex (matches opening ``---`` block)
_FRONTMATTER_RE = re.compile(r"\A---\s*\n(?P<yaml>.*?)\n---", re.DOTALL)

# Staleness threshold: graph is considered stale if the most recent update is
# older than this many hours.
_GRAPH_STALE_HOURS = 48

# Log directory size warning threshold (bytes).  100 MB.
_LOG_SIZE_WARN_BYTES = 100 * 1024 * 1024


# ---------------------------------------------------------------------------
# Status helpers
# ---------------------------------------------------------------------------

_STATUS_ORDER = {"ok": 0, "warn": 1, "error": 2}


def _worst_status(*statuses: str) -> str:
    """Return the most severe status among the arguments."""
    return max(statuses, key=lambda s: _STATUS_ORDER.get(s, 0))


def _result(status: str, message: str, details: dict | None = None) -> dict:
    """Build a standardised check result dict."""
    return {
        "status": status,
        "message": message,
        "details": details or {},
    }


# ---------------------------------------------------------------------------
# HealthCheck
# ---------------------------------------------------------------------------


class HealthCheck:
    """Checks system health across all PWI components.

    Usage::

        hc = HealthCheck(project_root="/path/to/project")
        report = hc.check_all()
        print(report["overall_status"])  # "ok", "warn", or "error"
    """

    def __init__(self, project_root: str = ".") -> None:
        """Initialise with the project root path.

        Args:
            project_root: Absolute or relative path to the repository root.
                          Defaults to the current working directory.
        """
        self.project_root = Path(project_root).resolve()
        self.skills_dir = self.project_root / ".claude" / "skills"
        self.hooks_dir = self.project_root / ".claude" / "hooks"
        self.settings_path = self.project_root / ".claude" / "settings.json"
        self.mcp_path = self.project_root / ".mcp.json"
        self.log_dir = self.project_root / "logs"
        self.graph_db_path = Path(
            os.environ.get("PWI_GRAPH_DB_PATH", str(self.project_root / "graph" / "pwi.db"))
        )

    # ------------------------------------------------------------------
    # Aggregate
    # ------------------------------------------------------------------

    def check_all(self) -> dict:
        """Run all health checks and return a combined report.

        Returns:
            A dictionary with a key per check (``skills``, ``graph``,
            ``mcp``, ``hooks``, ``logs``, ``env``) plus ``overall_status``
            and ``checked_at`` metadata fields.
        """
        checks = {
            "skills": self.check_skills(),
            "graph": self.check_graph(),
            "mcp": self.check_mcp(),
            "hooks": self.check_hooks(),
            "logs": self.check_logs(),
            "env": self.check_env(),
        }

        overall = "ok"
        for result in checks.values():
            overall = _worst_status(overall, result["status"])

        return {
            "overall_status": overall,
            "checked_at": datetime.now(timezone.utc).isoformat(),
            "project_root": str(self.project_root),
            **checks,
        }

    # ------------------------------------------------------------------
    # Individual checks
    # ------------------------------------------------------------------

    def check_skills(self) -> dict:
        """Verify that all expected skill directories exist and contain
        a ``SKILL.md`` with valid YAML frontmatter.

        Returns:
            ``{"status": ..., "message": ..., "details": {...}}``
        """
        if not self.skills_dir.is_dir():
            return _result(
                "error",
                f"Skills directory not found: {self.skills_dir}",
                {"path": str(self.skills_dir)},
            )

        missing: list[str] = []
        no_frontmatter: list[str] = []
        invalid_frontmatter: list[str] = []
        found: list[str] = []

        all_expected = EXPECTED_SKILLS + FETCH_SKILLS
        for skill_name in all_expected:
            skill_dir = self.skills_dir / skill_name
            skill_md = skill_dir / "SKILL.md"

            if not skill_dir.is_dir():
                missing.append(skill_name)
                continue

            if not skill_md.is_file():
                missing.append(skill_name)
                continue

            # Validate frontmatter
            try:
                text = skill_md.read_text(encoding="utf-8")
            except OSError:
                invalid_frontmatter.append(skill_name)
                continue

            match = _FRONTMATTER_RE.match(text)
            if not match:
                no_frontmatter.append(skill_name)
                continue

            # Check for required fields (name, description, version)
            yaml_block = match.group("yaml")
            has_name = bool(re.search(r"^name\s*:", yaml_block, re.MULTILINE))
            has_desc = bool(re.search(r"^description\s*:", yaml_block, re.MULTILINE))
            has_ver = bool(re.search(r"^version\s*:", yaml_block, re.MULTILINE))
            if not (has_name and has_desc and has_ver):
                missing_fields = []
                if not has_name:
                    missing_fields.append("name")
                if not has_desc:
                    missing_fields.append("description")
                if not has_ver:
                    missing_fields.append("version")
                invalid_frontmatter.append(f"{skill_name} (missing: {', '.join(missing_fields)})")
                continue

            found.append(skill_name)

        details: dict[str, Any] = {
            "total_expected": len(all_expected),
            "found": len(found),
            "missing": missing,
            "no_frontmatter": no_frontmatter,
            "invalid_frontmatter": invalid_frontmatter,
        }

        if missing:
            return _result(
                "warn" if len(missing) <= 5 else "error",
                f"{len(missing)} skill(s) missing or incomplete out of {len(all_expected)} expected",
                details,
            )

        if no_frontmatter or invalid_frontmatter:
            return _result(
                "warn",
                "All skill directories exist but some have frontmatter issues",
                details,
            )

        return _result("ok", f"All {len(found)} skills verified", details)

    def check_graph(self) -> dict:
        """Check knowledge-graph health: database existence, node/edge counts,
        and staleness.

        Returns:
            ``{"status": ..., "message": ..., "details": {...}}``
        """
        if not self.graph_db_path.is_file():
            return _result(
                "warn",
                f"Graph database not found at {self.graph_db_path}",
                {"db_path": str(self.graph_db_path)},
            )

        try:
            conn = sqlite3.connect(str(self.graph_db_path))
            conn.row_factory = sqlite3.Row
        except sqlite3.Error as exc:
            return _result(
                "error",
                f"Cannot open graph database: {exc}",
                {"db_path": str(self.graph_db_path)},
            )

        try:
            # Check tables exist
            tables = [
                row[0]
                for row in conn.execute(
                    "SELECT name FROM sqlite_master WHERE type='table'"
                ).fetchall()
            ]

            if "nodes" not in tables or "edges" not in tables:
                return _result(
                    "error",
                    "Graph database is missing required tables (nodes/edges)",
                    {"db_path": str(self.graph_db_path), "tables_found": tables},
                )

            # Counts
            node_count = conn.execute("SELECT COUNT(*) FROM nodes").fetchone()[0]
            edge_count = conn.execute("SELECT COUNT(*) FROM edges").fetchone()[0]

            # Type distributions
            node_types: dict[str, int] = {}
            for row in conn.execute(
                "SELECT type, COUNT(*) AS cnt FROM nodes GROUP BY type"
            ).fetchall():
                node_types[row["type"]] = row["cnt"]

            edge_types: dict[str, int] = {}
            for row in conn.execute(
                "SELECT rel_type, COUNT(*) AS cnt FROM edges GROUP BY rel_type"
            ).fetchall():
                edge_types[row["rel_type"]] = row["cnt"]

            # Staleness
            last_row = conn.execute(
                "SELECT MAX(updated_at) AS last FROM nodes"
            ).fetchone()
            last_updated = last_row["last"] if last_row else None

            stale = False
            hours_since_update: float | None = None
            if last_updated:
                try:
                    last_dt = datetime.fromisoformat(last_updated)
                    now = datetime.now(timezone.utc)
                    hours_since_update = (now - last_dt).total_seconds() / 3600
                    stale = hours_since_update > _GRAPH_STALE_HOURS
                except (ValueError, TypeError):
                    pass

            details: dict[str, Any] = {
                "db_path": str(self.graph_db_path),
                "db_size_bytes": self.graph_db_path.stat().st_size,
                "node_count": node_count,
                "edge_count": edge_count,
                "node_types": node_types,
                "edge_types": edge_types,
                "last_updated": last_updated,
                "hours_since_update": round(hours_since_update, 1) if hours_since_update is not None else None,
                "stale": stale,
            }

            if node_count == 0 and edge_count == 0:
                return _result("warn", "Graph database exists but is empty", details)

            if stale:
                return _result(
                    "warn",
                    f"Graph data is stale (last updated {hours_since_update:.1f}h ago, threshold {_GRAPH_STALE_HOURS}h)",
                    details,
                )

            return _result(
                "ok",
                f"Graph healthy: {node_count} nodes, {edge_count} edges",
                details,
            )
        except sqlite3.Error as exc:
            return _result(
                "error",
                f"Error querying graph database: {exc}",
                {"db_path": str(self.graph_db_path)},
            )
        finally:
            conn.close()

    def check_mcp(self) -> dict:
        """Verify ``.mcp.json`` is valid JSON and that referenced environment
        variables are set.

        Returns:
            ``{"status": ..., "message": ..., "details": {...}}``
        """
        if not self.mcp_path.is_file():
            return _result(
                "error",
                f".mcp.json not found at {self.mcp_path}",
                {"path": str(self.mcp_path)},
            )

        try:
            text = self.mcp_path.read_text(encoding="utf-8")
            config = json.loads(text)
        except json.JSONDecodeError as exc:
            return _result(
                "error",
                f".mcp.json contains invalid JSON: {exc}",
                {"path": str(self.mcp_path)},
            )
        except OSError as exc:
            return _result(
                "error",
                f"Cannot read .mcp.json: {exc}",
                {"path": str(self.mcp_path)},
            )

        servers = config.get("mcpServers", {})
        if not servers:
            return _result(
                "warn",
                ".mcp.json has no mcpServers defined",
                {"path": str(self.mcp_path)},
            )

        # Collect env var references from all server configs
        env_var_refs: dict[str, list[str]] = {}  # var_name -> list of server names
        missing_env: dict[str, list[str]] = {}

        for server_name, server_config in servers.items():
            env_block = server_config.get("env", {})
            for key, value in env_block.items():
                # Extract ${VAR_NAME} or ${VAR_NAME:-default} references
                refs = re.findall(r"\$\{([A-Z_][A-Z0-9_]*)(?::-[^}]*)?\}", str(value))
                for ref in refs:
                    env_var_refs.setdefault(ref, []).append(server_name)
                    if not os.environ.get(ref):
                        missing_env.setdefault(ref, []).append(server_name)

        details: dict[str, Any] = {
            "path": str(self.mcp_path),
            "servers": list(servers.keys()),
            "server_count": len(servers),
            "env_vars_referenced": {k: v for k, v in env_var_refs.items()},
            "env_vars_missing": {k: v for k, v in missing_env.items()},
        }

        if missing_env:
            return _result(
                "warn",
                f"{len(missing_env)} env var(s) referenced in .mcp.json are not set: {', '.join(sorted(missing_env))}",
                details,
            )

        return _result(
            "ok",
            f".mcp.json valid with {len(servers)} server(s) configured",
            details,
        )

    def check_hooks(self) -> dict:
        """Verify that all hook scripts referenced in ``.claude/settings.json``
        exist and are executable.

        Returns:
            ``{"status": ..., "message": ..., "details": {...}}``
        """
        if not self.settings_path.is_file():
            return _result(
                "warn",
                f"Settings file not found: {self.settings_path}",
                {"path": str(self.settings_path)},
            )

        try:
            text = self.settings_path.read_text(encoding="utf-8")
            settings = json.loads(text)
        except (json.JSONDecodeError, OSError) as exc:
            return _result(
                "error",
                f"Cannot parse settings.json: {exc}",
                {"path": str(self.settings_path)},
            )

        hooks_config = settings.get("hooks", {})
        if not hooks_config:
            return _result(
                "ok",
                "No hooks configured in settings.json",
                {"path": str(self.settings_path)},
            )

        # Extract script paths from hook commands
        referenced_scripts: list[str] = []
        missing_scripts: list[str] = []
        not_executable: list[str] = []
        found_scripts: list[str] = []

        for hook_type, hook_list in hooks_config.items():
            if not isinstance(hook_list, list):
                continue
            for hook_entry in hook_list:
                command = hook_entry.get("command", "")
                # Extract script paths -- look for .sh files in the command string
                # Patterns like: "$(pwd)/.claude/hooks/guard-protected.sh"
                script_matches = re.findall(
                    r'(?:\$\(pwd\)/)?\.claude/hooks/([a-zA-Z0-9_-]+\.sh)', command
                )
                for script_name in script_matches:
                    if script_name not in referenced_scripts:
                        referenced_scripts.append(script_name)

        for script_name in referenced_scripts:
            script_path = self.hooks_dir / script_name
            if not script_path.is_file():
                missing_scripts.append(script_name)
            elif not os.access(script_path, os.X_OK):
                not_executable.append(script_name)
            else:
                found_scripts.append(script_name)

        details: dict[str, Any] = {
            "settings_path": str(self.settings_path),
            "hooks_dir": str(self.hooks_dir),
            "referenced_scripts": referenced_scripts,
            "found_scripts": found_scripts,
            "missing_scripts": missing_scripts,
            "not_executable": not_executable,
        }

        if missing_scripts:
            return _result(
                "error",
                f"{len(missing_scripts)} hook script(s) missing: {', '.join(missing_scripts)}",
                details,
            )

        if not_executable:
            return _result(
                "warn",
                f"{len(not_executable)} hook script(s) not executable: {', '.join(not_executable)}",
                details,
            )

        return _result(
            "ok",
            f"All {len(found_scripts)} hook scripts present and executable",
            details,
        )

    def check_logs(self) -> dict:
        """Check the log directory: disk usage, recent errors, and last
        pipeline run time.

        Returns:
            ``{"status": ..., "message": ..., "details": {...}}``
        """
        if not self.log_dir.is_dir():
            return _result(
                "warn",
                f"Log directory not found: {self.log_dir}",
                {"path": str(self.log_dir)},
            )

        # Compute total size of log files
        total_size = 0
        log_files: list[str] = []
        for entry in self.log_dir.iterdir():
            if entry.is_file():
                log_files.append(entry.name)
                try:
                    total_size += entry.stat().st_size
                except OSError:
                    pass

        # Scan for recent errors in skill_executions.jsonl
        recent_errors: list[dict[str, Any]] = []
        exec_log = self.log_dir / "skill_executions.jsonl"
        last_execution_time: str | None = None
        total_executions = 0

        if exec_log.is_file():
            try:
                with open(exec_log, "r", encoding="utf-8") as fh:
                    for line in fh:
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            entry = json.loads(line)
                            total_executions += 1
                            logged_at = entry.get("logged_at")
                            if logged_at:
                                last_execution_time = logged_at
                            if not entry.get("success", True):
                                recent_errors.append({
                                    "skill_name": entry.get("skill_name", "unknown"),
                                    "errors": entry.get("errors", []),
                                    "logged_at": logged_at,
                                })
                        except json.JSONDecodeError:
                            pass
            except OSError:
                pass

        # Last pipeline run
        last_pipeline_time: str | None = None
        pipeline_log = self.log_dir / "pipeline_runs.jsonl"
        total_pipeline_runs = 0

        if pipeline_log.is_file():
            try:
                with open(pipeline_log, "r", encoding="utf-8") as fh:
                    for line in fh:
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            entry = json.loads(line)
                            total_pipeline_runs += 1
                            logged_at = entry.get("logged_at")
                            if logged_at:
                                last_pipeline_time = logged_at
                        except json.JSONDecodeError:
                            pass
            except OSError:
                pass

        details: dict[str, Any] = {
            "path": str(self.log_dir),
            "log_files": log_files,
            "total_size_bytes": total_size,
            "total_size_human": _format_bytes(total_size),
            "total_executions": total_executions,
            "total_pipeline_runs": total_pipeline_runs,
            "last_execution_time": last_execution_time,
            "last_pipeline_time": last_pipeline_time,
            "recent_error_count": len(recent_errors),
            "recent_errors": recent_errors[-10:],  # last 10 errors
        }

        status = "ok"
        messages: list[str] = []

        if total_size > _LOG_SIZE_WARN_BYTES:
            status = _worst_status(status, "warn")
            messages.append(
                f"Log directory is large ({_format_bytes(total_size)})"
            )

        if recent_errors:
            error_rate = len(recent_errors) / max(total_executions, 1)
            if error_rate > 0.5:
                status = _worst_status(status, "warn")
                messages.append(
                    f"High error rate: {len(recent_errors)}/{total_executions} executions failed"
                )

        if not messages:
            messages.append(
                f"Logs healthy: {total_executions} executions, "
                f"{total_pipeline_runs} pipeline runs, "
                f"{_format_bytes(total_size)} on disk"
            )

        return _result(status, "; ".join(messages), details)

    def check_env(self) -> dict:
        """Verify that required environment variables are set.

        Returns:
            ``{"status": ..., "message": ..., "details": {...}}``
        """
        set_required: list[str] = []
        missing_required: list[str] = []

        for var in REQUIRED_ENV_VARS:
            if os.environ.get(var):
                set_required.append(var)
            else:
                missing_required.append(var)

        set_optional: list[str] = []
        missing_optional: list[str] = []

        for var in OPTIONAL_ENV_VARS:
            if os.environ.get(var):
                set_optional.append(var)
            else:
                missing_optional.append(var)

        details: dict[str, Any] = {
            "required_set": set_required,
            "required_missing": missing_required,
            "optional_set": set_optional,
            "optional_missing": missing_optional,
        }

        if missing_required:
            return _result(
                "warn",
                f"{len(missing_required)} required env var(s) not set: {', '.join(missing_required)}",
                details,
            )

        msg = f"All {len(REQUIRED_ENV_VARS)} required env vars set"
        if missing_optional:
            msg += f" ({len(missing_optional)} optional var(s) not set)"

        return _result("ok", msg, details)


# ---------------------------------------------------------------------------
# Module-level helpers
# ---------------------------------------------------------------------------

def _format_bytes(size: int) -> str:
    """Format a byte count as a human-readable string."""
    for unit in ("B", "KB", "MB", "GB"):
        if abs(size) < 1024:
            return f"{size:.1f} {unit}" if unit != "B" else f"{size} B"
        size /= 1024  # type: ignore[assignment]
    return f"{size:.1f} TB"
