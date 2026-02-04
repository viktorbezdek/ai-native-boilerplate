"""Tests for the SchemaValidator against graph/schema.json.

Validates node data, edge type constraints, required-field introspection,
and schema-level queries.
"""

import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from pwi.graph.schema import SchemaValidator


# ------------------------------------------------------------------
# Node validation
# ------------------------------------------------------------------


class TestNodeValidation:
    """Tests for validate_node against graph/schema.json entity definitions."""

    def test_validate_valid_node(self, schema_validator):
        """A fully-populated message node passes validation."""
        data = {
            "id": "msg001",
            "source": "google-chat",
            "sender": "alice@example.com",
            "text": "Hello team",
            "timestamp": "2025-01-15T09:30:00Z",
            "mentions": ["bob@example.com"],
            "links": [],
        }
        is_valid, errors = schema_validator.validate_node("message", data)
        assert is_valid is True, f"Expected valid but got errors: {errors}"
        assert errors == []

    def test_validate_node_missing_required_field(self, schema_validator):
        """A message node missing required fields fails validation."""
        # 'sender' and 'text' and others are required for message type
        data = {
            "id": "msg002",
            "source": "google-chat",
            # missing: sender, text, timestamp, mentions, links
        }
        is_valid, errors = schema_validator.validate_node("message", data)
        assert is_valid is False
        assert len(errors) > 0

        # Check that at least one error mentions a missing field
        error_text = " ".join(errors)
        assert "Missing required field" in error_text

    def test_validate_node_unknown_type(self, schema_validator):
        """An unrecognised node type fails validation with an appropriate error."""
        is_valid, errors = schema_validator.validate_node("spaceship", {"foo": "bar"})
        assert is_valid is False
        assert len(errors) == 1
        assert "Unknown node type" in errors[0]

    def test_validate_valid_issue_node(self, schema_validator):
        """A complete issue node passes validation."""
        data = {
            "key": "ENG-42",
            "summary": "Fix deployment pipeline",
            "status": "In Progress",
            "reporter": "alice@example.com",
            "priority": "High",
            "created": "2025-01-10T08:00:00Z",
            "updated": "2025-01-15T09:00:00Z",
            "labels": ["ops"],
            "links": [],
        }
        is_valid, errors = schema_validator.validate_node("issue", data)
        assert is_valid is True, f"Expected valid but got errors: {errors}"

    def test_validate_node_optional_fields_omitted(self, schema_validator):
        """Optional fields (marked with ?) can be omitted without error."""
        # contact type: name?, communication_style?, last_interaction? are optional
        data = {
            "email": "test@example.com",
            "aliases": [],
            "interaction_count": 0,
            "links": [],
        }
        is_valid, errors = schema_validator.validate_node("contact", data)
        assert is_valid is True, f"Expected valid but got errors: {errors}"


# ------------------------------------------------------------------
# Edge validation
# ------------------------------------------------------------------


class TestEdgeValidation:
    """Tests for validate_edge relationship type checking."""

    def test_validate_edge_valid(self, schema_validator):
        """A valid edge between correct source/target types passes."""
        # Schema: mentions = "contact -> message[]"
        is_valid, errors = schema_validator.validate_edge(
            "mentions", "contact", "message"
        )
        assert is_valid is True, f"Expected valid but got errors: {errors}"
        assert errors == []

    def test_validate_edge_invalid_types(self, schema_validator):
        """An edge with incorrect source/target types fails validation."""
        # 'mentions' requires source=contact, target=message
        is_valid, errors = schema_validator.validate_edge(
            "mentions", "issue", "task"
        )
        assert is_valid is False
        assert len(errors) > 0

    def test_validate_edge_unknown_relationship(self, schema_validator):
        """An unknown relationship type fails validation."""
        is_valid, errors = schema_validator.validate_edge(
            "teleports_to", "contact", "message"
        )
        assert is_valid is False
        assert "Unknown relationship type" in errors[0]

    def test_validate_edge_wildcard_relationship(self, schema_validator):
        """The 'related_to' wildcard relationship (* -> *) accepts any types."""
        is_valid, errors = schema_validator.validate_edge(
            "related_to", "message", "issue"
        )
        assert is_valid is True, f"Expected valid but got errors: {errors}"

        # Also valid between other types
        is_valid2, errors2 = schema_validator.validate_edge(
            "related_to", "task", "contact"
        )
        assert is_valid2 is True, f"Expected valid but got errors: {errors2}"

    def test_validate_edge_pipe_separated_targets(self, schema_validator):
        """The 'assigned_to' relationship allows issue|task as target."""
        # Schema: assigned_to = "contact -> issue|task"
        is_valid_issue, _ = schema_validator.validate_edge(
            "assigned_to", "contact", "issue"
        )
        is_valid_task, _ = schema_validator.validate_edge(
            "assigned_to", "contact", "task"
        )
        is_valid_message, errors_msg = schema_validator.validate_edge(
            "assigned_to", "contact", "message"
        )

        assert is_valid_issue is True
        assert is_valid_task is True
        assert is_valid_message is False


# ------------------------------------------------------------------
# Schema introspection
# ------------------------------------------------------------------


class TestSchemaIntrospection:
    """Tests for schema metadata queries."""

    def test_get_required_fields(self, schema_validator):
        """get_required_fields returns non-optional fields for a node type."""
        required = schema_validator.get_required_fields("message")
        assert isinstance(required, list)
        assert len(required) > 0
        # 'id', 'source', 'sender', 'text', 'timestamp' are all required
        assert "id" in required
        assert "source" in required
        assert "sender" in required
        assert "text" in required
        assert "timestamp" in required
        # 'thread_id' and 'space' are optional (string?)
        assert "thread_id" not in required
        assert "space" not in required

    def test_get_required_fields_unknown_type(self, schema_validator):
        """get_required_fields returns an empty list for an unknown type."""
        required = schema_validator.get_required_fields("wormhole")
        assert required == []

    def test_get_node_types(self, schema_validator):
        """get_node_types returns all entity types defined in schema.json."""
        types = schema_validator.get_node_types()
        assert isinstance(types, list)
        # Schema defines: message, event, issue, task, metric, contact
        expected = {"message", "event", "issue", "task", "metric", "contact"}
        assert expected.issubset(set(types))

    def test_get_relationship_types(self, schema_validator):
        """get_relationship_types returns all relationships from schema.json."""
        rel_types = schema_validator.get_relationship_types()
        assert isinstance(rel_types, list)
        # Schema defines: mentions, attends, assigned_to, related_to
        expected = {"mentions", "attends", "assigned_to", "related_to"}
        assert expected.issubset(set(rel_types))
