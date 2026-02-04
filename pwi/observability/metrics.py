"""Metrics collection and reporting for the PWI platform.

Reads the JSONL log files produced by :class:`~pwi.skills.executor.SkillExecutor`
and aggregates them into structured metrics suitable for dashboards, reports,
and the self-improvement-loop skill.

All methods use only the standard library (``json``, ``os``, ``datetime``,
``pathlib``, ``sqlite3``, ``collections``).
"""

from __future__ import annotations

import json
import os
import sqlite3
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any


class MetricsCollector:
    """Collects and reports PWI execution metrics.

    Reads from the JSONL log files written by the skill executor and pipeline
    runner:

    * ``skill_executions.jsonl`` -- one JSON object per skill execution
    * ``pipeline_runs.jsonl``    -- one JSON object per pipeline run

    It can also read the knowledge-graph SQLite database to track graph growth
    over time.

    Usage::

        mc = MetricsCollector(log_dir="./logs")
        report = mc.generate_report()
        print(json.dumps(report, indent=2))
    """

    def __init__(
        self,
        log_dir: str = "./logs",
        graph_db_path: str | None = None,
    ) -> None:
        """Initialise with the log directory path.

        Args:
            log_dir: Directory containing JSONL log files. Defaults to
                     ``./logs``.
            graph_db_path: Optional explicit path to the graph SQLite DB.
                           If not provided, uses the ``PWI_GRAPH_DB_PATH``
                           environment variable, or falls back to
                           ``./graph/pwi.db``.
        """
        self.log_dir = Path(log_dir).resolve()
        self.skill_log = self.log_dir / "skill_executions.jsonl"
        self.pipeline_log = self.log_dir / "pipeline_runs.jsonl"
        self.graph_db_path = Path(
            graph_db_path
            or os.environ.get("PWI_GRAPH_DB_PATH", "./graph/pwi.db")
        )

    # ------------------------------------------------------------------
    # Skill metrics
    # ------------------------------------------------------------------

    def get_skill_metrics(self, days: int = 30) -> dict:
        """Aggregate skill execution metrics from log files.

        Scans ``skill_executions.jsonl`` for entries within the specified
        time window and returns per-skill statistics.

        Args:
            days: Number of days to look back. Defaults to 30.

        Returns:
            Dictionary with per-skill breakdown and global totals::

                {
                    "period_days": 30,
                    "total_executions": 150,
                    "total_successes": 140,
                    "total_failures": 10,
                    "overall_success_rate": 0.93,
                    "avg_confidence": 0.72,
                    "avg_duration_ms": 42,
                    "skills": {
                        "stale-detection": {
                            "executions": 20,
                            "successes": 19,
                            "failures": 1,
                            "success_rate": 0.95,
                            "avg_confidence": 0.88,
                            "avg_duration_ms": 35,
                            "min_confidence": 0.65,
                            "max_confidence": 0.95,
                            "last_run": "2026-01-30T...",
                        },
                        ...
                    },
                }
        """
        entries = self._read_skill_entries(days)

        if not entries:
            return {
                "period_days": days,
                "total_executions": 0,
                "total_successes": 0,
                "total_failures": 0,
                "overall_success_rate": 0.0,
                "avg_confidence": 0.0,
                "avg_duration_ms": 0,
                "skills": {},
            }

        per_skill: dict[str, list[dict]] = defaultdict(list)
        for e in entries:
            per_skill[e.get("skill_name", "unknown")].append(e)

        skills_summary: dict[str, dict] = {}
        total_exec = 0
        total_success = 0
        total_fail = 0
        all_confidences: list[float] = []
        all_durations: list[int] = []

        for skill_name, skill_entries in sorted(per_skill.items()):
            successes = [e for e in skill_entries if e.get("success", False)]
            failures = [e for e in skill_entries if not e.get("success", True)]
            confidences = [
                float(e.get("confidence", 0.0)) for e in skill_entries
            ]
            durations = [
                int(e.get("duration_ms", 0)) for e in skill_entries
            ]
            last_run_entries = sorted(
                skill_entries,
                key=lambda x: x.get("logged_at", ""),
                reverse=True,
            )

            skills_summary[skill_name] = {
                "executions": len(skill_entries),
                "successes": len(successes),
                "failures": len(failures),
                "success_rate": round(len(successes) / len(skill_entries), 3) if skill_entries else 0.0,
                "avg_confidence": round(sum(confidences) / len(confidences), 3) if confidences else 0.0,
                "avg_duration_ms": round(sum(durations) / len(durations)) if durations else 0,
                "min_confidence": round(min(confidences), 3) if confidences else 0.0,
                "max_confidence": round(max(confidences), 3) if confidences else 0.0,
                "last_run": last_run_entries[0].get("logged_at") if last_run_entries else None,
            }

            total_exec += len(skill_entries)
            total_success += len(successes)
            total_fail += len(failures)
            all_confidences.extend(confidences)
            all_durations.extend(durations)

        return {
            "period_days": days,
            "total_executions": total_exec,
            "total_successes": total_success,
            "total_failures": total_fail,
            "overall_success_rate": round(total_success / total_exec, 3) if total_exec else 0.0,
            "avg_confidence": round(sum(all_confidences) / len(all_confidences), 3) if all_confidences else 0.0,
            "avg_duration_ms": round(sum(all_durations) / len(all_durations)) if all_durations else 0,
            "skills": skills_summary,
        }

    # ------------------------------------------------------------------
    # Pipeline metrics
    # ------------------------------------------------------------------

    def get_pipeline_metrics(self, days: int = 30) -> dict:
        """Aggregate pipeline run metrics from log files.

        Scans ``pipeline_runs.jsonl`` for entries within the specified time
        window.

        Args:
            days: Number of days to look back. Defaults to 30.

        Returns:
            Dictionary with pipeline run statistics::

                {
                    "period_days": 30,
                    "total_runs": 12,
                    "avg_duration_ms": 5200,
                    "avg_skills_per_run": 8.5,
                    "avg_success_rate": 0.95,
                    "runs_with_failures": 2,
                    "most_common_failures": {"skill-x": 3, ...},
                    "runs_requiring_input": 4,
                    "last_run": "2026-01-30T...",
                    "runs": [...],
                }
        """
        entries = self._read_pipeline_entries(days)

        if not entries:
            return {
                "period_days": days,
                "total_runs": 0,
                "avg_duration_ms": 0,
                "avg_skills_per_run": 0.0,
                "avg_success_rate": 0.0,
                "runs_with_failures": 0,
                "most_common_failures": {},
                "runs_requiring_input": 0,
                "last_run": None,
                "runs": [],
            }

        durations: list[int] = []
        skills_per_run: list[int] = []
        success_rates: list[float] = []
        failure_counter: Counter = Counter()
        runs_with_failures = 0
        runs_requiring_input = 0

        run_summaries: list[dict] = []
        for entry in entries:
            total_ms = int(entry.get("total_ms", 0))
            durations.append(total_ms)

            executed = int(entry.get("skills_executed", 0))
            succeeded = int(entry.get("skills_succeeded", 0))
            skills_per_run.append(executed)
            if executed > 0:
                success_rates.append(succeeded / executed)

            failed_skills = entry.get("failed", [])
            if failed_skills:
                runs_with_failures += 1
                for s in failed_skills:
                    failure_counter[s] += 1

            requires_input = entry.get("requires_user_input", [])
            if requires_input:
                runs_requiring_input += 1

            run_summaries.append({
                "logged_at": entry.get("logged_at"),
                "total_ms": total_ms,
                "skills_executed": executed,
                "skills_succeeded": succeeded,
                "failed": failed_skills,
                "requires_user_input": requires_input,
            })

        sorted_entries = sorted(entries, key=lambda x: x.get("logged_at", ""), reverse=True)

        return {
            "period_days": days,
            "total_runs": len(entries),
            "avg_duration_ms": round(sum(durations) / len(durations)) if durations else 0,
            "avg_skills_per_run": round(sum(skills_per_run) / len(skills_per_run), 1) if skills_per_run else 0.0,
            "avg_success_rate": round(sum(success_rates) / len(success_rates), 3) if success_rates else 0.0,
            "runs_with_failures": runs_with_failures,
            "most_common_failures": dict(failure_counter.most_common(10)),
            "runs_requiring_input": runs_requiring_input,
            "last_run": sorted_entries[0].get("logged_at") if sorted_entries else None,
            "runs": run_summaries,
        }

    # ------------------------------------------------------------------
    # Graph growth
    # ------------------------------------------------------------------

    def get_graph_growth(self, days: int = 30) -> dict:
        """Track knowledge-graph growth over time.

        Queries the SQLite graph database to determine how many nodes and
        edges were created per day within the specified time window.

        Args:
            days: Number of days to look back. Defaults to 30.

        Returns:
            Dictionary with daily growth data::

                {
                    "period_days": 30,
                    "current_nodes": 500,
                    "current_edges": 1200,
                    "nodes_added": 150,
                    "edges_added": 320,
                    "daily_growth": [
                        {"date": "2026-01-15", "nodes_added": 10, "edges_added": 25},
                        ...
                    ],
                }
        """
        if not self.graph_db_path.is_file():
            return {
                "period_days": days,
                "current_nodes": 0,
                "current_edges": 0,
                "nodes_added": 0,
                "edges_added": 0,
                "daily_growth": [],
                "error": f"Graph database not found: {self.graph_db_path}",
            }

        try:
            conn = sqlite3.connect(str(self.graph_db_path))
            conn.row_factory = sqlite3.Row
        except sqlite3.Error as exc:
            return {
                "period_days": days,
                "current_nodes": 0,
                "current_edges": 0,
                "nodes_added": 0,
                "edges_added": 0,
                "daily_growth": [],
                "error": f"Cannot open graph database: {exc}",
            }

        try:
            cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

            # Current totals
            current_nodes = conn.execute("SELECT COUNT(*) FROM nodes").fetchone()[0]
            current_edges = conn.execute("SELECT COUNT(*) FROM edges").fetchone()[0]

            # Nodes added per day (using created_at)
            node_rows = conn.execute(
                "SELECT DATE(created_at) AS day, COUNT(*) AS cnt "
                "FROM nodes WHERE created_at >= ? "
                "GROUP BY DATE(created_at) ORDER BY day",
                (cutoff,),
            ).fetchall()

            # Edges added per day (using created_at)
            edge_rows = conn.execute(
                "SELECT DATE(created_at) AS day, COUNT(*) AS cnt "
                "FROM edges WHERE created_at >= ? "
                "GROUP BY DATE(created_at) ORDER BY day",
                (cutoff,),
            ).fetchall()

            # Merge into daily growth records
            node_by_day: dict[str, int] = {}
            for row in node_rows:
                day = row["day"] if row["day"] else "unknown"
                node_by_day[day] = row["cnt"]

            edge_by_day: dict[str, int] = {}
            for row in edge_rows:
                day = row["day"] if row["day"] else "unknown"
                edge_by_day[day] = row["cnt"]

            all_days = sorted(set(list(node_by_day.keys()) + list(edge_by_day.keys())))
            daily_growth: list[dict] = []
            total_nodes_added = 0
            total_edges_added = 0

            for day in all_days:
                na = node_by_day.get(day, 0)
                ea = edge_by_day.get(day, 0)
                total_nodes_added += na
                total_edges_added += ea
                daily_growth.append({
                    "date": day,
                    "nodes_added": na,
                    "edges_added": ea,
                })

            return {
                "period_days": days,
                "current_nodes": current_nodes,
                "current_edges": current_edges,
                "nodes_added": total_nodes_added,
                "edges_added": total_edges_added,
                "daily_growth": daily_growth,
            }
        except sqlite3.Error as exc:
            return {
                "period_days": days,
                "current_nodes": 0,
                "current_edges": 0,
                "nodes_added": 0,
                "edges_added": 0,
                "daily_growth": [],
                "error": f"Error querying graph database: {exc}",
            }
        finally:
            conn.close()

    # ------------------------------------------------------------------
    # Error summary
    # ------------------------------------------------------------------

    def get_error_summary(self, days: int = 7) -> dict:
        """Summarise recent errors by type and frequency.

        Scans ``skill_executions.jsonl`` for failed entries within the time
        window and groups errors by skill and error message pattern.

        Args:
            days: Number of days to look back. Defaults to 7.

        Returns:
            Dictionary with error breakdown::

                {
                    "period_days": 7,
                    "total_errors": 15,
                    "errors_by_skill": {"skill-x": 5, "skill-y": 10},
                    "errors_by_type": {"ValueError": 8, "TimeoutError": 7},
                    "error_rate": 0.12,
                    "recent_errors": [...],
                }
        """
        entries = self._read_skill_entries(days)

        failed = [e for e in entries if not e.get("success", True)]

        if not failed:
            return {
                "period_days": days,
                "total_errors": 0,
                "total_executions": len(entries),
                "errors_by_skill": {},
                "errors_by_type": {},
                "error_rate": 0.0,
                "recent_errors": [],
            }

        errors_by_skill: Counter = Counter()
        errors_by_type: Counter = Counter()
        recent_errors: list[dict] = []

        for entry in failed:
            skill_name = entry.get("skill_name", "unknown")
            errors_by_skill[skill_name] += 1

            for error_msg in entry.get("errors", []):
                # Extract error type from messages like "ValueError: ..."
                error_type = _extract_error_type(error_msg)
                errors_by_type[error_type] += 1

            recent_errors.append({
                "skill_name": skill_name,
                "errors": entry.get("errors", []),
                "confidence": entry.get("confidence", 0.0),
                "logged_at": entry.get("logged_at"),
            })

        # Sort recent errors by time descending, keep last 20
        recent_errors.sort(key=lambda x: x.get("logged_at", ""), reverse=True)
        recent_errors = recent_errors[:20]

        return {
            "period_days": days,
            "total_errors": len(failed),
            "total_executions": len(entries),
            "errors_by_skill": dict(errors_by_skill.most_common()),
            "errors_by_type": dict(errors_by_type.most_common()),
            "error_rate": round(len(failed) / len(entries), 3) if entries else 0.0,
            "recent_errors": recent_errors,
        }

    # ------------------------------------------------------------------
    # Comprehensive report
    # ------------------------------------------------------------------

    def generate_report(self) -> dict:
        """Generate a comprehensive metrics report.

        Combines skill metrics, pipeline metrics, graph growth, and error
        summary into a single report dictionary.

        Returns:
            Dictionary with all metrics sections plus metadata::

                {
                    "generated_at": "2026-02-03T...",
                    "log_dir": "/path/to/logs",
                    "skill_metrics": {...},
                    "pipeline_metrics": {...},
                    "graph_growth": {...},
                    "error_summary": {...},
                    "highlights": {...},
                }
        """
        skill_metrics = self.get_skill_metrics(days=30)
        pipeline_metrics = self.get_pipeline_metrics(days=30)
        graph_growth = self.get_graph_growth(days=30)
        error_summary = self.get_error_summary(days=7)

        # Compute highlights
        highlights = self._compute_highlights(
            skill_metrics, pipeline_metrics, graph_growth, error_summary
        )

        return {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "log_dir": str(self.log_dir),
            "skill_metrics": skill_metrics,
            "pipeline_metrics": pipeline_metrics,
            "graph_growth": graph_growth,
            "error_summary": error_summary,
            "highlights": highlights,
        }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _read_skill_entries(self, days: int) -> list[dict]:
        """Read and filter skill execution log entries within a time window."""
        return self._read_jsonl(self.skill_log, days)

    def _read_pipeline_entries(self, days: int) -> list[dict]:
        """Read and filter pipeline run log entries within a time window."""
        return self._read_jsonl(self.pipeline_log, days)

    def _read_jsonl(self, path: Path, days: int) -> list[dict]:
        """Read a JSONL file and return entries within the time window.

        Args:
            path: Path to the JSONL file.
            days: Number of days to look back from now.

        Returns:
            List of parsed JSON dictionaries, filtered to the time window.
        """
        if not path.is_file():
            return []

        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        entries: list[dict] = []

        try:
            with open(path, "r", encoding="utf-8") as fh:
                for line in fh:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        entry = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    # Filter by time
                    logged_at = entry.get("logged_at")
                    if logged_at:
                        try:
                            entry_time = datetime.fromisoformat(logged_at)
                            if entry_time < cutoff:
                                continue
                        except (ValueError, TypeError):
                            pass  # Include entries with unparseable timestamps

                    entries.append(entry)
        except OSError:
            pass

        return entries

    @staticmethod
    def _compute_highlights(
        skill_metrics: dict,
        pipeline_metrics: dict,
        graph_growth: dict,
        error_summary: dict,
    ) -> dict:
        """Compute actionable highlights from all metrics sections.

        Returns a dictionary with notable observations that the
        self-improvement-loop or notification skill could act on.
        """
        highlights: dict[str, Any] = {}

        # Top performing skills (highest avg confidence)
        skills = skill_metrics.get("skills", {})
        if skills:
            sorted_by_confidence = sorted(
                skills.items(),
                key=lambda kv: kv[1].get("avg_confidence", 0),
                reverse=True,
            )
            highlights["top_skills"] = [
                {"name": name, "avg_confidence": data["avg_confidence"]}
                for name, data in sorted_by_confidence[:5]
            ]

            # Struggling skills (lowest success rate with at least 2 executions)
            struggling = [
                (name, data)
                for name, data in skills.items()
                if data.get("executions", 0) >= 2 and data.get("success_rate", 1.0) < 0.8
            ]
            struggling.sort(key=lambda kv: kv[1].get("success_rate", 1.0))
            highlights["struggling_skills"] = [
                {"name": name, "success_rate": data["success_rate"], "executions": data["executions"]}
                for name, data in struggling[:5]
            ]

        # Graph health indicators
        nodes_added = graph_growth.get("nodes_added", 0)
        edges_added = graph_growth.get("edges_added", 0)
        highlights["graph_activity"] = {
            "nodes_added_30d": nodes_added,
            "edges_added_30d": edges_added,
            "is_growing": (nodes_added + edges_added) > 0,
        }

        # Error trend
        error_rate = error_summary.get("error_rate", 0.0)
        highlights["error_health"] = {
            "error_rate_7d": error_rate,
            "status": "healthy" if error_rate < 0.1 else ("concerning" if error_rate < 0.3 else "critical"),
            "top_error_types": dict(
                sorted(
                    error_summary.get("errors_by_type", {}).items(),
                    key=lambda kv: kv[1],
                    reverse=True,
                )[:3]
            ),
        }

        # Pipeline throughput
        total_runs = pipeline_metrics.get("total_runs", 0)
        highlights["pipeline_throughput"] = {
            "runs_30d": total_runs,
            "avg_duration_ms": pipeline_metrics.get("avg_duration_ms", 0),
            "avg_success_rate": pipeline_metrics.get("avg_success_rate", 0.0),
        }

        return highlights


# ---------------------------------------------------------------------------
# Module-level helpers
# ---------------------------------------------------------------------------

def _extract_error_type(error_msg: str) -> str:
    """Extract the error type from an error message string.

    Handles formats like ``"ValueError: some detail"`` and
    ``"TimeoutError: operation timed out"``.  Falls back to ``"Unknown"``
    if no recognisable pattern is found.
    """
    if ":" in error_msg:
        potential_type = error_msg.split(":")[0].strip()
        # Check if it looks like a Python exception class name
        if potential_type and potential_type[0].isupper() and " " not in potential_type:
            return potential_type
    return "Unknown"
