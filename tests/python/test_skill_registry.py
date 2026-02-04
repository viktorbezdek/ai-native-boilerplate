"""Tests for the SkillRegistry -- skill discovery, filtering, and metadata.

Verifies that the registry discovers all SKILL.md files under .claude/skills/,
parses their YAML frontmatter correctly, and supports tag / trigger filtering
and parallel-group queries.
"""

import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from pwi.skills.registry import SkillRegistry, SkillDescriptor, _validate_meta


# ------------------------------------------------------------------
# Discovery
# ------------------------------------------------------------------


class TestDiscovery:
    """Tests for skill scanning and discovery."""

    def test_discovers_all_skills(self, skill_registry):
        """The registry should find >= 28 skills from .claude/skills/."""
        skill_count = len(skill_registry.skills)
        assert skill_count >= 28, (
            f"Expected at least 28 skills but found {skill_count}. "
            f"Names: {skill_registry.skill_names}"
        )

    def test_skill_has_name(self, skill_registry):
        """Every discovered skill has a non-empty name."""
        for skill in skill_registry.skills:
            assert isinstance(skill.name, str)
            assert len(skill.name) > 0, f"Skill at {skill.path} has an empty name"

    def test_skill_has_description(self, skill_registry):
        """Every discovered skill has a non-empty description."""
        for skill in skill_registry.skills:
            assert isinstance(skill.description, str)
            assert len(skill.description) > 0, (
                f"Skill '{skill.name}' at {skill.path} has an empty description"
            )

    def test_well_known_skills_present(self, skill_registry):
        """Key skills that should exist are discoverable by name."""
        expected_names = [
            "stale-detection",
            "misalignment-check",
            "reply-suggestion",
            "sentiment-analysis",
            "fetch-google-chat",
            "fetch-jira",
        ]
        registered_names = set(skill_registry.skill_names)
        for name in expected_names:
            assert name in registered_names, (
                f"Expected skill '{name}' not found in registry. "
                f"Registered: {sorted(registered_names)}"
            )


# ------------------------------------------------------------------
# Filtering
# ------------------------------------------------------------------


class TestFiltering:
    """Tests for tag-based and trigger-based filtering."""

    def test_filter_by_tag(self, skill_registry):
        """filter_by_tag returns only skills that carry the given tag."""
        fetch_skills = skill_registry.filter_by_tag("fetch")
        assert len(fetch_skills) >= 1
        for skill in fetch_skills:
            assert "fetch" in skill.tags, (
                f"Skill '{skill.name}' was returned by filter_by_tag('fetch') "
                f"but does not have the 'fetch' tag: {skill.tags}"
            )

    def test_filter_by_tags_match_all(self, skill_registry):
        """filter_by_tags with match_all=True requires all specified tags."""
        # Skills tagged both 'analysis' and 'core' (e.g. stale-detection)
        results = skill_registry.filter_by_tags(
            ["analysis", "core"], match_all=True
        )
        for skill in results:
            assert "analysis" in skill.tags
            assert "core" in skill.tags

        # With match_all=False, we should get a superset
        any_results = skill_registry.filter_by_tags(
            ["analysis", "core"], match_all=False
        )
        assert len(any_results) >= len(results)

    def test_filter_by_tags_match_any(self, skill_registry):
        """filter_by_tags with match_all=False returns skills with any of the tags."""
        results = skill_registry.filter_by_tags(
            ["fetch", "sentiment"], match_all=False
        )
        assert len(results) >= 2
        for skill in results:
            assert "fetch" in skill.tags or "sentiment" in skill.tags

    def test_match_trigger(self, skill_registry):
        """match_trigger returns skills whose trigger patterns match the text."""
        matches = skill_registry.match_trigger("detect stale items in the backlog")
        matched_names = [s.name for s in matches]
        assert "stale-detection" in matched_names, (
            f"Expected 'stale-detection' to match 'detect stale' trigger but "
            f"matched: {matched_names}"
        )

    def test_match_trigger_no_match(self, skill_registry):
        """match_trigger returns an empty list when nothing matches."""
        matches = skill_registry.match_trigger("xyzzy_no_skill_matches_this_42")
        assert matches == []


# ------------------------------------------------------------------
# Parallel groups
# ------------------------------------------------------------------


class TestParallelGroups:
    """Tests for parallel execution group mapping."""

    def test_get_parallel_groups(self, skill_registry):
        """get_parallel_groups returns non-empty groups for known categories."""
        groups = skill_registry.get_parallel_groups()
        assert isinstance(groups, dict)

        # At minimum, the 'fetch' group should have multiple entries
        assert "fetch" in groups, f"Expected 'fetch' group; got keys: {list(groups.keys())}"
        assert len(groups["fetch"]) >= 2

        # Check that group values contain actual skill names
        for group_name, skill_names in groups.items():
            for name in skill_names:
                assert skill_registry.get(name) is not None, (
                    f"Skill '{name}' in group '{group_name}' not found in registry"
                )


# ------------------------------------------------------------------
# Validation
# ------------------------------------------------------------------


class TestValidation:
    """Tests for SKILL.md structural validation."""

    def test_validate_skill_structure(self, skill_registry):
        """Every registered skill has the required fields: name, description, version."""
        for skill in skill_registry.skills:
            assert skill.name, f"Skill missing name at {skill.path}"
            assert skill.description, f"Skill '{skill.name}' missing description"
            assert skill.version, f"Skill '{skill.name}' missing version"
            assert isinstance(skill.tags, list), (
                f"Skill '{skill.name}' tags should be a list, got {type(skill.tags)}"
            )

    def test_validate_meta_catches_missing_fields(self):
        """_validate_meta returns warnings for missing required fields."""
        incomplete_meta = {"name": "test-skill"}
        warnings = _validate_meta(incomplete_meta, "test/path/SKILL.md")
        assert len(warnings) > 0
        warning_text = " ".join(warnings)
        assert "description" in warning_text or "version" in warning_text

    def test_validate_meta_passes_for_complete(self):
        """_validate_meta returns no warnings for a complete metadata dict."""
        complete_meta = {
            "name": "test-skill",
            "description": "A test skill",
            "version": "1.0.0",
            "tags": ["test"],
            "trigger": [{"pattern": "test"}],
            "confidence_threshold": 0.7,
        }
        warnings = _validate_meta(complete_meta, "test/path/SKILL.md")
        assert warnings == []

    def test_skill_descriptor_to_dict(self, skill_registry):
        """SkillDescriptor.to_dict() returns a JSON-serialisable dictionary."""
        skill = skill_registry.skills[0]
        d = skill.to_dict()
        assert isinstance(d, dict)
        assert d["name"] == skill.name
        assert d["description"] == skill.description
        assert d["version"] == skill.version
        assert "tags" in d
        assert "triggers" in d
