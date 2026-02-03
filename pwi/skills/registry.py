"""SkillRegistry -- discovers and registers PWI skills from SKILL.md files.

Scans the `.claude/skills/*/SKILL.md` tree, parses YAML frontmatter from each
file, and exposes a queryable catalogue of skills with filtering by tags,
trigger patterns, and other metadata.
"""

from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# YAML frontmatter parser (lightweight, no external dependency)
# ---------------------------------------------------------------------------

_FRONTMATTER_RE = re.compile(
    r"\A---\s*\n(?P<yaml>.*?)\n---", re.DOTALL
)


def _parse_yaml_frontmatter(text: str) -> dict[str, Any]:
    """Parse a minimal YAML frontmatter block without requiring PyYAML.

    Supports the subset actually used in SKILL.md files:
      - scalar key/value  (``key: value``)
      - list items        (``- item``)
      - nested list items under a key (``trigger:\\n  - pattern: "..."`` )

    For production use with richer YAML, swap this out for ``yaml.safe_load``.
    """
    match = _FRONTMATTER_RE.match(text)
    if not match:
        return {}

    raw = match.group("yaml")
    result: dict[str, Any] = {}
    current_key: str | None = None
    current_list: list | None = None

    for line in raw.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        # Detect top-level key
        top_match = re.match(r"^(\w[\w_-]*)\s*:\s*(.*)", line)
        if top_match and not line.startswith(" ") and not line.startswith("\t"):
            # Flush previous list
            if current_key is not None and current_list is not None:
                result[current_key] = current_list

            key = top_match.group(1)
            value = top_match.group(2).strip()
            if value:
                # Try to coerce to number / bool
                result[key] = _coerce(value)
                current_key = None
                current_list = None
            else:
                # Value will come as indented list items
                current_key = key
                current_list = []
            continue

        # Indented list item
        list_match = re.match(r"^\s+-\s+(.*)", line)
        if list_match and current_list is not None:
            item_text = list_match.group(1).strip()
            # Handle ``pattern: "some text"`` style sub-items
            sub_kv = re.match(r'(\w+)\s*:\s*"?([^"]*)"?', item_text)
            if sub_kv:
                current_list.append({sub_kv.group(1): sub_kv.group(2)})
            else:
                current_list.append(_coerce(item_text))
            continue

    # Flush remaining
    if current_key is not None and current_list is not None:
        result[current_key] = current_list

    return result


def _coerce(value: str) -> Any:
    """Best-effort coercion of a YAML scalar string."""
    if value.lower() in ("true", "yes"):
        return True
    if value.lower() in ("false", "no"):
        return False
    try:
        return int(value)
    except ValueError:
        pass
    try:
        return float(value)
    except ValueError:
        pass
    # Strip surrounding quotes
    if len(value) >= 2 and value[0] == value[-1] and value[0] in ('"', "'"):
        return value[1:-1]
    return value


# ---------------------------------------------------------------------------
# Skill descriptor
# ---------------------------------------------------------------------------

@dataclass
class SkillDescriptor:
    """Metadata about a single registered skill."""

    name: str
    description: str
    version: str
    tags: list[str] = field(default_factory=list)
    triggers: list[dict[str, str]] = field(default_factory=list)
    confidence_threshold: float = 0.5
    mcp_server: str | None = None
    path: str = ""  # filesystem path to the SKILL.md
    raw_meta: dict[str, Any] = field(default_factory=dict, repr=False)

    def matches_tag(self, tag: str) -> bool:
        return tag in self.tags

    def matches_trigger(self, text: str) -> bool:
        """Return True if *text* matches any of the skill's trigger patterns."""
        text_lower = text.lower()
        return any(
            trigger.get("pattern", "").lower() in text_lower
            for trigger in self.triggers
        )

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "version": self.version,
            "tags": self.tags,
            "triggers": self.triggers,
            "confidence_threshold": self.confidence_threshold,
            "mcp_server": self.mcp_server,
            "path": self.path,
        }


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

_REQUIRED_FIELDS = ("name", "description", "version")


class SkillValidationError(Exception):
    """Raised when a SKILL.md file fails structural validation."""


def _validate_meta(meta: dict, path: str) -> list[str]:
    """Return a list of validation warning messages (empty == valid)."""
    warnings: list[str] = []
    for field_name in _REQUIRED_FIELDS:
        if field_name not in meta:
            warnings.append(f"{path}: missing required field '{field_name}'")
    if "tags" in meta and not isinstance(meta["tags"], list):
        warnings.append(f"{path}: 'tags' should be a list")
    if "trigger" in meta and not isinstance(meta["trigger"], list):
        warnings.append(f"{path}: 'trigger' should be a list")
    threshold = meta.get("confidence_threshold")
    if threshold is not None:
        try:
            val = float(threshold)
            if not 0.0 <= val <= 1.0:
                warnings.append(
                    f"{path}: confidence_threshold {val} outside [0, 1]"
                )
        except (TypeError, ValueError):
            warnings.append(
                f"{path}: confidence_threshold is not a number"
            )
    return warnings


# ---------------------------------------------------------------------------
# SkillRegistry
# ---------------------------------------------------------------------------

class SkillRegistry:
    """Discovers and catalogues PWI skills from the filesystem.

    Usage::

        registry = SkillRegistry(project_root="/path/to/project")
        registry.scan()

        # all skills
        for skill in registry.skills:
            print(skill.name)

        # filter by tag
        analysis_skills = registry.filter_by_tag("analysis")

        # find skills matching user text
        matches = registry.match_trigger("detect stale items")
    """

    def __init__(
        self,
        project_root: str | Path = ".",
        skills_dir: str = ".claude/skills",
        *,
        strict: bool = False,
    ) -> None:
        """
        Args:
            project_root: Absolute or relative path to the project root.
            skills_dir:   Relative path (from *project_root*) to the skills
                          directory.
            strict:       If True, raise on validation errors instead of
                          logging warnings.
        """
        self.project_root = Path(project_root).resolve()
        self.skills_dir = self.project_root / skills_dir
        self.strict = strict

        self._skills: dict[str, SkillDescriptor] = {}
        self._validation_warnings: list[str] = []

    # ----- public API -----

    @property
    def skills(self) -> list[SkillDescriptor]:
        """Return all registered skills in alphabetical order."""
        return sorted(self._skills.values(), key=lambda s: s.name)

    @property
    def skill_names(self) -> list[str]:
        return [s.name for s in self.skills]

    @property
    def validation_warnings(self) -> list[str]:
        return list(self._validation_warnings)

    def get(self, name: str) -> SkillDescriptor | None:
        """Look up a skill by name."""
        return self._skills.get(name)

    def scan(self) -> list[SkillDescriptor]:
        """Scan the skills directory and populate the registry.

        Returns the list of successfully registered skills.
        """
        self._skills.clear()
        self._validation_warnings.clear()

        if not self.skills_dir.is_dir():
            logger.warning("Skills directory does not exist: %s", self.skills_dir)
            return []

        for skill_dir in sorted(self.skills_dir.iterdir()):
            if not skill_dir.is_dir():
                continue
            skill_md = skill_dir / "SKILL.md"
            if not skill_md.is_file():
                logger.debug("Skipping %s (no SKILL.md)", skill_dir.name)
                continue

            try:
                self._register_from_file(skill_md)
            except SkillValidationError as exc:
                if self.strict:
                    raise
                logger.warning("Validation error: %s", exc)
                self._validation_warnings.append(str(exc))
            except Exception as exc:  # noqa: BLE001
                msg = f"Failed to parse {skill_md}: {exc}"
                logger.warning(msg)
                self._validation_warnings.append(msg)

        logger.info("Registered %d skills", len(self._skills))
        return self.skills

    def filter_by_tag(self, tag: str) -> list[SkillDescriptor]:
        """Return skills that carry the given tag."""
        return [s for s in self.skills if s.matches_tag(tag)]

    def filter_by_tags(self, tags: list[str], *, match_all: bool = False) -> list[SkillDescriptor]:
        """Filter by multiple tags.

        Args:
            tags: Tags to filter on.
            match_all: If True, the skill must have *all* tags. Otherwise any.
        """
        if match_all:
            return [
                s for s in self.skills
                if all(s.matches_tag(t) for t in tags)
            ]
        return [
            s for s in self.skills
            if any(s.matches_tag(t) for t in tags)
        ]

    def match_trigger(self, text: str) -> list[SkillDescriptor]:
        """Return skills whose trigger patterns match *text*."""
        return [s for s in self.skills if s.matches_trigger(text)]

    def get_parallel_groups(self) -> dict[str, list[str]]:
        """Return pre-defined parallel execution groups based on tags.

        Groups mirror the parallel_groups config in CLAUDE.md.
        """
        groups: dict[str, list[str]] = {
            "fetch": [],
            "core_analysis": [],
            "sentiment": [],
            "mining": [],
            "enrichment": [],
        }

        tag_to_group = {
            "fetch": "fetch",
            "analysis": "core_analysis",
            "sentiment": "sentiment",
            "nlp": "sentiment",
            "mining": "mining",
            "enrichment": "enrichment",
        }

        # Also map by known skill names from CLAUDE.md
        name_to_group = {
            "fetch-google-chat": "fetch",
            "fetch-calendar": "fetch",
            "fetch-jira": "fetch",
            "fetch-asana": "fetch",
            "fetch-sheets": "fetch",
            "fetch-slack": "fetch",
            "fetch-email": "fetch",
            "stale-detection": "core_analysis",
            "misalignment-check": "core_analysis",
            "reply-suggestion": "core_analysis",
            "sentiment-analysis": "sentiment",
            "morale-forecasting": "sentiment",
            "blocker-identification": "mining",
            "action-item-extraction": "mining",
            "trend-detection": "mining",
            "inference-engine": "enrichment",
            "knowledge-gap-filler": "enrichment",
            "semantic-enrichment": "enrichment",
        }

        for skill in self.skills:
            # First try explicit name mapping
            if skill.name in name_to_group:
                group = name_to_group[skill.name]
                if skill.name not in groups[group]:
                    groups[group].append(skill.name)
                continue

            # Fall back to tag-based grouping
            for tag in skill.tags:
                if tag in tag_to_group:
                    group = tag_to_group[tag]
                    if skill.name not in groups[group]:
                        groups[group].append(skill.name)
                    break  # only assign to first matching group

        # Remove empty groups
        return {k: v for k, v in groups.items() if v}

    # ----- internal helpers -----

    def _register_from_file(self, path: Path) -> None:
        """Parse a SKILL.md and register its descriptor."""
        text = path.read_text(encoding="utf-8")
        meta = _parse_yaml_frontmatter(text)

        if not meta:
            msg = f"{path}: no YAML frontmatter found"
            self._validation_warnings.append(msg)
            logger.warning(msg)
            return

        # Validate
        warnings = _validate_meta(meta, str(path))
        self._validation_warnings.extend(warnings)
        if warnings and self.strict:
            raise SkillValidationError("; ".join(warnings))

        name = meta.get("name", path.parent.name)
        descriptor = SkillDescriptor(
            name=name,
            description=meta.get("description", ""),
            version=str(meta.get("version", "0.0.0")),
            tags=meta.get("tags", []),
            triggers=meta.get("trigger", []),
            confidence_threshold=float(meta.get("confidence_threshold", 0.5)),
            mcp_server=meta.get("mcp_server"),
            path=str(path),
            raw_meta=meta,
        )

        if name in self._skills:
            logger.warning("Duplicate skill name '%s' -- overwriting", name)
        self._skills[name] = descriptor
        logger.debug("Registered skill: %s (%s)", name, path)
