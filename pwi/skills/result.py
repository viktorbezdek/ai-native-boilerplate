"""SkillResult dataclass for PWI skill execution outcomes."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class SkillResult:
    """Represents the outcome of a single skill execution.

    Every skill execution produces a SkillResult that captures the output data,
    confidence score, timing information, and any errors encountered. The
    confidence score drives the routing logic in the executor:
      - >= 0.8  : auto-execute, log result
      - 0.5-0.8 : execute with notification
      - < 0.5   : pause, require user input

    Attributes:
        skill_name: Identifier of the skill that was executed.
        success: Whether the skill completed without fatal errors.
        confidence: Probabilistic confidence in the result (0.0 - 1.0).
        data: Arbitrary output payload from the skill.
        duration_ms: Wall-clock execution time in milliseconds.
        timestamp: ISO-8601 timestamp of when execution completed.
        errors: List of error messages encountered during execution.
        requires_user_input: Flag indicating that a human must review/decide.
        user_prompt: Optional structured prompt for human-in-loop interaction.
    """

    skill_name: str
    success: bool
    confidence: float
    data: dict
    duration_ms: int
    timestamp: str
    errors: list[str] = field(default_factory=list)
    requires_user_input: bool = False
    user_prompt: dict | None = None

    # ------------------------------------------------------------------
    # Confidence threshold constants (mirroring CLAUDE.md spec)
    # ------------------------------------------------------------------
    AUTO_EXECUTE_THRESHOLD: float = field(default=0.8, init=False, repr=False)
    NOTIFY_THRESHOLD: float = field(default=0.5, init=False, repr=False)

    # ------------------------------------------------------------------
    # Convenience helpers
    # ------------------------------------------------------------------

    @staticmethod
    def now_iso() -> str:
        """Return the current UTC time as an ISO-8601 string."""
        return datetime.now(timezone.utc).isoformat()

    @property
    def is_auto_executable(self) -> bool:
        """True when confidence is high enough for unattended execution."""
        return self.confidence >= self.AUTO_EXECUTE_THRESHOLD

    @property
    def needs_notification(self) -> bool:
        """True when the result should trigger a notification."""
        return self.NOTIFY_THRESHOLD <= self.confidence < self.AUTO_EXECUTE_THRESHOLD

    @property
    def needs_human_review(self) -> bool:
        """True when confidence is too low for automatic action."""
        return self.confidence < self.NOTIFY_THRESHOLD or self.requires_user_input

    def to_dict(self) -> dict:
        """Serialize to a plain dictionary suitable for JSON output."""
        return {
            "skill_name": self.skill_name,
            "success": self.success,
            "confidence": self.confidence,
            "data": self.data,
            "duration_ms": self.duration_ms,
            "timestamp": self.timestamp,
            "errors": self.errors,
            "requires_user_input": self.requires_user_input,
            "user_prompt": self.user_prompt,
        }

    @classmethod
    def from_dict(cls, d: dict) -> SkillResult:
        """Reconstruct a SkillResult from a plain dictionary."""
        return cls(
            skill_name=d["skill_name"],
            success=d["success"],
            confidence=d["confidence"],
            data=d.get("data", {}),
            duration_ms=d.get("duration_ms", 0),
            timestamp=d.get("timestamp", cls.now_iso()),
            errors=d.get("errors", []),
            requires_user_input=d.get("requires_user_input", False),
            user_prompt=d.get("user_prompt"),
        )

    @classmethod
    def error_result(cls, skill_name: str, error_msg: str) -> SkillResult:
        """Convenience factory for creating a failed result."""
        return cls(
            skill_name=skill_name,
            success=False,
            confidence=0.0,
            data={},
            duration_ms=0,
            timestamp=cls.now_iso(),
            errors=[error_msg],
            requires_user_input=True,
            user_prompt={
                "ambiguity_detected": True,
                "question": f"Skill '{skill_name}' failed: {error_msg}. How should we proceed?",
                "options": [
                    {"id": 1, "label": "Retry"},
                    {"id": 2, "label": "Skip this skill"},
                    {"id": 3, "label": "Abort pipeline"},
                ],
            },
        )
