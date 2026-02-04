"""SkillExecutor -- runs PWI skills with confidence-based routing.

Provides single-skill, parallel, and full-pipeline execution modes. Every
execution is timed, wrapped in error handling, and routed through the
confidence thresholds defined in the project spec:

    >= 0.8  auto-execute, log result
    0.5-0.8 execute with notification
    < 0.5   pause, return requires_user_input=True
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Coroutine

from .registry import SkillDescriptor, SkillRegistry
from .result import SkillResult

logger = logging.getLogger(__name__)

# Type alias for the async skill handler functions that callers register.
SkillHandler = Callable[[str, dict], Coroutine[Any, Any, dict]]


class SkillExecutor:
    """Executes PWI skills with confidence-based routing.

    The executor does **not** contain the business logic of individual skills.
    Instead, callers register async handler functions via :meth:`register_handler`.
    When a skill is executed the executor:

    1. Looks it up in the :class:`SkillRegistry`.
    2. Calls the registered handler (or the ``_default_handler``).
    3. Wraps the return value in a :class:`SkillResult`.
    4. Routes the result through the confidence logic.
    5. Logs the execution to disk.

    Usage::

        executor = SkillExecutor(graph_store={}, registry=registry)

        # Register a custom handler for a skill
        async def my_stale_handler(skill_name, context):
            return {"items_found": 5, "confidence": 0.85}

        executor.register_handler("stale-detection", my_stale_handler)

        result = await executor.execute("stale-detection", {"since": "7d"})
    """

    # ------------------------------------------------------------------
    # Confidence thresholds
    # ------------------------------------------------------------------
    THRESHOLD_AUTO: float = 0.8
    THRESHOLD_NOTIFY: float = 0.5

    def __init__(
        self,
        graph_store: Any,
        registry: SkillRegistry,
        log_dir: str | Path = "./logs",
    ) -> None:
        """
        Args:
            graph_store: Reference to the knowledge-graph store (dict, NetworkX
                         graph, or any object your handlers need).
            registry:    A :class:`SkillRegistry` that has already been scanned.
            log_dir:     Directory where execution logs are written.
        """
        self.graph_store = graph_store
        self.registry = registry
        self.log_dir = Path(log_dir).resolve()
        self.log_dir.mkdir(parents=True, exist_ok=True)

        # Handler registry: skill_name -> async callable
        self._handlers: dict[str, SkillHandler] = {}

        # Optional notification callback (e.g. macOS notification)
        self._notify_callback: Callable[[SkillResult], Any] | None = None

    # ------------------------------------------------------------------
    # Handler registration
    # ------------------------------------------------------------------

    def register_handler(self, skill_name: str, handler: SkillHandler) -> None:
        """Register an async handler function for *skill_name*."""
        self._handlers[skill_name] = handler

    def set_notify_callback(self, callback: Callable[[SkillResult], Any]) -> None:
        """Set the callback invoked when a result falls in the notification band."""
        self._notify_callback = callback

    # ------------------------------------------------------------------
    # Single execution
    # ------------------------------------------------------------------

    async def execute(self, skill_name: str, context: dict) -> SkillResult:
        """Execute a single skill with timing and error handling.

        Args:
            skill_name: Name of the skill as registered in the registry.
            context:    Arbitrary context dict forwarded to the handler.

        Returns:
            A :class:`SkillResult` with timing, confidence, and routing info.
        """
        descriptor = self.registry.get(skill_name)
        if descriptor is None:
            result = SkillResult.error_result(
                skill_name, f"Skill '{skill_name}' not found in registry"
            )
            self._log_execution(result)
            return result

        handler = self._handlers.get(skill_name, self._default_handler)

        start = time.monotonic()
        try:
            raw = await handler(skill_name, {**context, "graph_store": self.graph_store})
            elapsed_ms = int((time.monotonic() - start) * 1000)

            confidence = float(raw.get("confidence", 0.0))
            errors = raw.get("errors", [])
            success = len(errors) == 0

            result = SkillResult(
                skill_name=skill_name,
                success=success,
                confidence=confidence,
                data=raw.get("data", raw),
                duration_ms=elapsed_ms,
                timestamp=SkillResult.now_iso(),
                errors=errors,
            )
        except Exception as exc:  # noqa: BLE001
            elapsed_ms = int((time.monotonic() - start) * 1000)
            result = SkillResult(
                skill_name=skill_name,
                success=False,
                confidence=0.0,
                data={},
                duration_ms=elapsed_ms,
                timestamp=SkillResult.now_iso(),
                errors=[f"{type(exc).__name__}: {exc}"],
            )

        # Apply confidence-based routing
        result = self._apply_routing(result, descriptor)

        # Log & optionally notify
        self._log_execution(result)
        if result.needs_notification and self._notify_callback:
            try:
                self._notify_callback(result)
            except Exception:  # noqa: BLE001
                logger.exception("Notification callback failed for %s", skill_name)

        return result

    # ------------------------------------------------------------------
    # Parallel execution
    # ------------------------------------------------------------------

    async def execute_parallel(
        self,
        skill_names: list[str],
        context: dict,
    ) -> list[SkillResult]:
        """Execute multiple skills concurrently.

        Args:
            skill_names: List of skill names to run in parallel.
            context:     Shared context dict (each skill gets its own copy).

        Returns:
            List of :class:`SkillResult` in the same order as *skill_names*.
        """
        tasks = [
            asyncio.create_task(self.execute(name, dict(context)))
            for name in skill_names
        ]
        return list(await asyncio.gather(*tasks, return_exceptions=False))

    # ------------------------------------------------------------------
    # Pipeline execution
    # ------------------------------------------------------------------

    async def execute_pipeline(
        self,
        pipeline: list[dict],
        context: dict,
    ) -> dict:
        """Execute a pipeline of sequential and/or parallel skill groups.

        The pipeline is an ordered list of steps. Each step is a dict with
        **exactly one** key:

        * ``{"parallel": ["skill-a", "skill-b"]}`` -- run skills concurrently.
        * ``{"sequential": ["skill-c", "skill-d"]}`` -- run skills one by one.

        Results from earlier steps are merged into the context under the key
        ``"prior_results"`` so that downstream skills can reference them.

        Args:
            pipeline: Pipeline definition.
            context:  Initial context dict.

        Returns:
            A summary dict with ``results``, ``failed``, and ``total_ms`` keys.
        """
        all_results: list[SkillResult] = []
        failed: list[str] = []
        pipeline_start = time.monotonic()
        running_context = dict(context)

        for step_index, step in enumerate(pipeline):
            step_results: list[SkillResult] = []

            if "parallel" in step:
                skill_names = step["parallel"]
                logger.info(
                    "Pipeline step %d: parallel [%s]",
                    step_index,
                    ", ".join(skill_names),
                )
                step_results = await self.execute_parallel(skill_names, running_context)

            elif "sequential" in step:
                skill_names = step["sequential"]
                logger.info(
                    "Pipeline step %d: sequential [%s]",
                    step_index,
                    ", ".join(skill_names),
                )
                for name in skill_names:
                    result = await self.execute(name, running_context)
                    step_results.append(result)
                    # Feed result into context for next sequential skill
                    running_context.setdefault("prior_results", {})[name] = result.to_dict()
            else:
                logger.warning(
                    "Pipeline step %d: unknown step type %s -- skipping",
                    step_index,
                    list(step.keys()),
                )
                continue

            # Accumulate results
            for r in step_results:
                all_results.append(r)
                running_context.setdefault("prior_results", {})[r.skill_name] = r.to_dict()
                if not r.success:
                    failed.append(r.skill_name)

        total_ms = int((time.monotonic() - pipeline_start) * 1000)

        summary = {
            "results": {r.skill_name: r.to_dict() for r in all_results},
            "failed": failed,
            "total_ms": total_ms,
            "skills_executed": len(all_results),
            "skills_succeeded": sum(1 for r in all_results if r.success),
            "requires_user_input": [
                r.skill_name for r in all_results if r.requires_user_input
            ],
        }

        self._log_pipeline(summary)
        return summary

    # ------------------------------------------------------------------
    # Confidence routing
    # ------------------------------------------------------------------

    def should_auto_execute(self, result: SkillResult) -> bool:
        """Check if result confidence allows auto-execution (>= 0.8)."""
        return result.confidence >= self.THRESHOLD_AUTO

    def should_notify(self, result: SkillResult) -> bool:
        """Check if result falls in the notification band (0.5 - 0.8)."""
        return self.THRESHOLD_NOTIFY <= result.confidence < self.THRESHOLD_AUTO

    def should_pause(self, result: SkillResult) -> bool:
        """Check if result confidence is too low for automatic action (< 0.5)."""
        return result.confidence < self.THRESHOLD_NOTIFY

    def route_low_confidence(self, result: SkillResult) -> dict:
        """Route low-confidence results to human-in-the-loop.

        Returns a structured prompt suitable for user interaction.
        """
        return {
            "action": "pause_for_human",
            "skill_name": result.skill_name,
            "confidence": result.confidence,
            "errors": result.errors,
            "ambiguity_detected": True,
            "question": (
                f"Skill '{result.skill_name}' returned confidence "
                f"{result.confidence:.2f} (below threshold {self.THRESHOLD_NOTIFY}). "
                "How should we proceed?"
            ),
            "options": [
                {"id": 1, "label": "Accept result as-is"},
                {"id": 2, "label": "Re-run with more context"},
                {"id": 3, "label": "Skip this skill"},
                {"id": 4, "label": "Provide manual input"},
            ],
            "data_preview": _truncate_data(result.data),
        }

    # ------------------------------------------------------------------
    # Logging
    # ------------------------------------------------------------------

    def _log_execution(self, result: SkillResult) -> None:
        """Log a single skill execution to a JSON-lines file."""
        log_file = self.log_dir / "skill_executions.jsonl"
        entry = {
            "event": "skill_execution",
            "logged_at": _now_iso(),
            **result.to_dict(),
        }
        try:
            with open(log_file, "a", encoding="utf-8") as fh:
                fh.write(json.dumps(entry, default=str) + "\n")
        except OSError:
            logger.exception("Failed to write execution log")

    def _log_pipeline(self, summary: dict) -> None:
        """Log an entire pipeline run."""
        log_file = self.log_dir / "pipeline_runs.jsonl"
        entry = {
            "event": "pipeline_run",
            "logged_at": _now_iso(),
            **summary,
        }
        try:
            with open(log_file, "a", encoding="utf-8") as fh:
                fh.write(json.dumps(entry, default=str) + "\n")
        except OSError:
            logger.exception("Failed to write pipeline log")

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _apply_routing(
        self,
        result: SkillResult,
        descriptor: SkillDescriptor,
    ) -> SkillResult:
        """Mutate *result* in-place to apply confidence-based routing flags."""
        if self.should_pause(result):
            result.requires_user_input = True
            result.user_prompt = self.route_low_confidence(result)
            logger.info(
                "Skill '%s' paused (confidence=%.2f < %.2f)",
                result.skill_name,
                result.confidence,
                self.THRESHOLD_NOTIFY,
            )
        elif self.should_notify(result):
            logger.info(
                "Skill '%s' completed with notification (confidence=%.2f)",
                result.skill_name,
                result.confidence,
            )
        else:
            logger.info(
                "Skill '%s' auto-executed (confidence=%.2f)",
                result.skill_name,
                result.confidence,
            )
        return result

    @staticmethod
    async def _default_handler(skill_name: str, context: dict) -> dict:
        """Placeholder handler for skills without a registered implementation.

        Returns a low-confidence result that will trigger human-in-loop routing.
        """
        return {
            "confidence": 0.0,
            "data": {},
            "errors": [
                f"No handler registered for skill '{skill_name}'. "
                "Register one via executor.register_handler()."
            ],
        }


# ---------------------------------------------------------------------------
# Module-level helpers
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _truncate_data(data: dict, max_keys: int = 10) -> dict:
    """Return a truncated preview of the data dict for user prompts."""
    if len(data) <= max_keys:
        return data
    keys = list(data.keys())[:max_keys]
    preview = {k: data[k] for k in keys}
    preview["_truncated"] = True
    preview["_total_keys"] = len(data)
    return preview
