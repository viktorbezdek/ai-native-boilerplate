"""Tests for the SkillExecutor -- execution, confidence routing, and pipelines.

All tests run without external services by using in-process async handlers
and the project's real SkillRegistry (pointed at .claude/skills/).
"""

import asyncio
import json
import os
import sys
from pathlib import Path

import pytest
import pytest_asyncio

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from pwi.skills.executor import SkillExecutor
from pwi.skills.registry import SkillRegistry
from pwi.skills.result import SkillResult


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def registry():
    """A scanned SkillRegistry for the project."""
    reg = SkillRegistry(project_root=str(PROJECT_ROOT))
    reg.scan()
    return reg


@pytest.fixture()
def executor(registry, tmp_path):
    """A SkillExecutor with a temp log directory and no real graph store."""
    return SkillExecutor(
        graph_store={},
        registry=registry,
        log_dir=str(tmp_path / "logs"),
    )


# Convenience: a handler factory that returns results with a given confidence.
def _make_handler(confidence: float, data: dict | None = None):
    """Create an async skill handler that returns a fixed confidence and data."""

    async def handler(skill_name: str, context: dict) -> dict:
        return {
            "confidence": confidence,
            "data": data or {"skill": skill_name, "processed": True},
        }

    return handler


# ---------------------------------------------------------------------------
# Single execution
# ---------------------------------------------------------------------------


class TestSingleExecution:
    """Tests for executing individual skills."""

    @pytest.mark.asyncio
    async def test_execute_returns_result(self, executor):
        """Executing a registered skill with a custom handler returns a SkillResult."""
        executor.register_handler(
            "stale-detection",
            _make_handler(0.9, {"items_found": 3}),
        )
        result = await executor.execute("stale-detection", {"since": "7d"})

        assert isinstance(result, SkillResult)
        assert result.skill_name == "stale-detection"
        assert result.success is True
        assert result.confidence == 0.9
        assert result.data["items_found"] == 3
        assert result.duration_ms >= 0

    @pytest.mark.asyncio
    async def test_execute_unknown_skill_returns_error(self, executor):
        """Executing a skill not in the registry returns an error result."""
        result = await executor.execute("nonexistent-skill-xyz", {})

        assert isinstance(result, SkillResult)
        assert result.success is False
        assert result.confidence == 0.0
        assert len(result.errors) > 0
        assert "not found" in result.errors[0].lower()

    @pytest.mark.asyncio
    async def test_execute_handler_exception(self, executor):
        """If a handler raises an exception, the result captures the error."""

        async def broken_handler(skill_name, context):
            raise ValueError("something went wrong")

        executor.register_handler("stale-detection", broken_handler)
        result = await executor.execute("stale-detection", {})

        assert result.success is False
        assert result.confidence == 0.0
        assert any("ValueError" in e for e in result.errors)


# ---------------------------------------------------------------------------
# Confidence-based routing
# ---------------------------------------------------------------------------


class TestConfidenceRouting:
    """Tests for the confidence threshold routing logic."""

    @pytest.mark.asyncio
    async def test_confidence_auto_execute(self, executor):
        """Confidence >= 0.8 triggers auto-execute (no user input needed)."""
        executor.register_handler(
            "stale-detection",
            _make_handler(0.85),
        )
        result = await executor.execute("stale-detection", {})

        assert result.confidence >= 0.8
        assert result.requires_user_input is False
        assert result.is_auto_executable is True
        assert result.needs_notification is False
        assert result.needs_human_review is False

    @pytest.mark.asyncio
    async def test_confidence_needs_notification(self, executor):
        """Confidence in [0.5, 0.8) triggers notification routing."""
        executor.register_handler(
            "stale-detection",
            _make_handler(0.65),
        )
        result = await executor.execute("stale-detection", {})

        assert 0.5 <= result.confidence < 0.8
        assert result.needs_notification is True
        assert result.is_auto_executable is False
        assert result.requires_user_input is False

    @pytest.mark.asyncio
    async def test_confidence_needs_human_review(self, executor):
        """Confidence < 0.5 triggers human-in-the-loop routing."""
        executor.register_handler(
            "stale-detection",
            _make_handler(0.3),
        )
        result = await executor.execute("stale-detection", {})

        assert result.confidence < 0.5
        assert result.requires_user_input is True
        assert result.needs_human_review is True
        assert result.user_prompt is not None
        assert "question" in result.user_prompt
        assert "options" in result.user_prompt

    @pytest.mark.asyncio
    async def test_notification_callback_invoked(self, executor):
        """The notification callback fires for results in the notify band."""
        notifications = []

        def on_notify(result):
            notifications.append(result)

        executor.set_notify_callback(on_notify)
        executor.register_handler(
            "stale-detection",
            _make_handler(0.65),
        )
        await executor.execute("stale-detection", {})

        assert len(notifications) == 1
        assert notifications[0].skill_name == "stale-detection"


# ---------------------------------------------------------------------------
# Parallel execution
# ---------------------------------------------------------------------------


class TestParallelExecution:
    """Tests for running multiple skills concurrently."""

    @pytest.mark.asyncio
    async def test_execute_parallel(self, executor):
        """execute_parallel runs multiple skills and returns all results."""
        skills_to_run = ["stale-detection", "misalignment-check"]
        for name in skills_to_run:
            executor.register_handler(name, _make_handler(0.9))

        results = await executor.execute_parallel(skills_to_run, {"test": True})

        assert len(results) == 2
        result_names = {r.skill_name for r in results}
        assert result_names == set(skills_to_run)
        assert all(r.success for r in results)


# ---------------------------------------------------------------------------
# Pipeline execution
# ---------------------------------------------------------------------------


class TestPipelineExecution:
    """Tests for sequential/parallel pipeline orchestration."""

    @pytest.mark.asyncio
    async def test_execute_pipeline(self, executor):
        """execute_pipeline runs a mixed sequential+parallel pipeline."""
        # Register handlers for all skills in the pipeline
        all_skills = [
            "fetch-google-chat",
            "fetch-jira",
            "stale-detection",
            "misalignment-check",
        ]
        for name in all_skills:
            executor.register_handler(name, _make_handler(0.9))

        pipeline = [
            {"parallel": ["fetch-google-chat", "fetch-jira"]},
            {"sequential": ["stale-detection", "misalignment-check"]},
        ]

        summary = await executor.execute_pipeline(pipeline, {"source": "test"})

        assert isinstance(summary, dict)
        assert summary["skills_executed"] == 4
        assert summary["skills_succeeded"] == 4
        assert summary["failed"] == []
        assert summary["total_ms"] >= 0
        assert "results" in summary
        assert set(summary["results"].keys()) == set(all_skills)

    @pytest.mark.asyncio
    async def test_pipeline_propagates_prior_results(self, executor):
        """Sequential pipeline steps can see results from earlier steps."""
        call_log = []

        async def tracking_handler(skill_name, context):
            call_log.append({
                "skill": skill_name,
                "has_prior": "prior_results" in context,
                "prior_keys": list(context.get("prior_results", {}).keys()),
            })
            return {"confidence": 0.9, "data": {"from": skill_name}}

        for name in ["fetch-google-chat", "stale-detection"]:
            executor.register_handler(name, tracking_handler)

        pipeline = [
            {"sequential": ["fetch-google-chat", "stale-detection"]},
        ]

        await executor.execute_pipeline(pipeline, {})

        # The second skill should see results from the first
        assert len(call_log) == 2
        second_call = call_log[1]
        assert second_call["has_prior"] is True
        assert "fetch-google-chat" in second_call["prior_keys"]


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------


class TestLogging:
    """Tests for execution log persistence."""

    @pytest.mark.asyncio
    async def test_log_execution(self, executor, tmp_path):
        """Each skill execution appends a JSON line to skill_executions.jsonl."""
        executor.register_handler(
            "stale-detection",
            _make_handler(0.85),
        )
        await executor.execute("stale-detection", {"test": True})

        log_file = tmp_path / "logs" / "skill_executions.jsonl"
        assert log_file.exists(), f"Expected log file at {log_file}"

        lines = log_file.read_text().strip().splitlines()
        assert len(lines) >= 1

        entry = json.loads(lines[-1])
        assert entry["event"] == "skill_execution"
        assert entry["skill_name"] == "stale-detection"
        assert "logged_at" in entry
        assert "confidence" in entry
        assert "duration_ms" in entry

    @pytest.mark.asyncio
    async def test_pipeline_log(self, executor, tmp_path):
        """Pipeline execution writes to pipeline_runs.jsonl."""
        for name in ["stale-detection", "misalignment-check"]:
            executor.register_handler(name, _make_handler(0.9))

        pipeline = [{"parallel": ["stale-detection", "misalignment-check"]}]
        await executor.execute_pipeline(pipeline, {})

        log_file = tmp_path / "logs" / "pipeline_runs.jsonl"
        assert log_file.exists(), f"Expected pipeline log at {log_file}"

        lines = log_file.read_text().strip().splitlines()
        assert len(lines) >= 1

        entry = json.loads(lines[-1])
        assert entry["event"] == "pipeline_run"
        assert entry["skills_executed"] == 2
