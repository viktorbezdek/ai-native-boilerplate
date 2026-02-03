"""Shared pytest fixtures for PWI test suite.

Provides reusable fixtures for GraphStore, SchemaValidator, SkillRegistry,
and sample graph data that matches graph/schema.json.
"""

import json
import os
import sys
import tempfile
from pathlib import Path

import pytest

# Ensure the project root is on sys.path so `pwi` is importable.
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from pwi.graph.store import GraphStore
from pwi.graph.schema import SchemaValidator
from pwi.skills.registry import SkillRegistry


# ---------------------------------------------------------------------------
# Database / GraphStore fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def tmp_db(tmp_path):
    """Create a temporary SQLite database path inside a temp directory.

    Yields the path string.  The file (and parent directory) are cleaned up
    automatically by pytest's ``tmp_path`` fixture after the test finishes.
    """
    db_path = str(tmp_path / "test_graph.db")
    yield db_path
    # Cleanup: remove the database file if it still exists
    if os.path.exists(db_path):
        os.unlink(db_path)
    wal = db_path + "-wal"
    shm = db_path + "-shm"
    if os.path.exists(wal):
        os.unlink(wal)
    if os.path.exists(shm):
        os.unlink(shm)


@pytest.fixture()
def graph_store(tmp_db):
    """Return a fresh GraphStore instance backed by a temporary database."""
    store = GraphStore(db_path=tmp_db)
    yield store
    store.close()


# ---------------------------------------------------------------------------
# Sample data fixtures (aligned with graph/schema.json entity types)
# ---------------------------------------------------------------------------

@pytest.fixture()
def sample_nodes():
    """Return a list of sample node tuples (id, type, data).

    Covers the four main entity types used across tests: message, issue,
    task, and contact.
    """
    return [
        (
            "google-chat_msg001",
            "message",
            {
                "id": "msg001",
                "source": "google-chat",
                "sender": "alice@example.com",
                "text": "Hey team, the deploy is blocked on ENG-42",
                "timestamp": "2025-01-15T09:30:00Z",
                "thread_id": "thread_abc",
                "space": "Engineering",
                "mentions": ["bob@example.com"],
                "links": [],
            },
        ),
        (
            "ENG-42",
            "issue",
            {
                "key": "ENG-42",
                "summary": "Fix production deployment pipeline",
                "status": "In Progress",
                "assignee": "bob@example.com",
                "reporter": "alice@example.com",
                "priority": "High",
                "created": "2025-01-10T08:00:00Z",
                "updated": "2025-01-15T09:00:00Z",
                "labels": ["ops", "deployment"],
                "sprint": "Sprint 23",
                "story_points": 5,
                "links": [],
            },
        ),
        (
            "asana_task_001",
            "task",
            {
                "gid": "task_001",
                "name": "Review Q1 roadmap",
                "completed": False,
                "assignee": "carol@example.com",
                "due_on": "2025-01-20",
                "projects": ["Project Alpha"],
                "tags": ["planning", "q1"],
                "created_at": "2025-01-05T12:00:00Z",
                "modified_at": "2025-01-14T16:00:00Z",
                "links": [],
            },
        ),
        (
            "alice@example.com",
            "contact",
            {
                "email": "alice@example.com",
                "name": "Alice Johnson",
                "aliases": ["alice", "aj"],
                "interaction_count": 42,
                "links": [],
            },
        ),
    ]


@pytest.fixture()
def sample_edges():
    """Return a list of sample edge tuples (source, target, rel_type, data, confidence)."""
    return [
        (
            "alice@example.com",
            "google-chat_msg001",
            "mentions",
            {"context": "sent message"},
            0.95,
        ),
        (
            "alice@example.com",
            "ENG-42",
            "assigned_to",
            {"role": "reporter"},
            0.90,
        ),
        (
            "google-chat_msg001",
            "ENG-42",
            "related_to",
            {"reason": "message references issue"},
            0.85,
        ),
    ]


@pytest.fixture()
def populated_store(graph_store, sample_nodes, sample_edges):
    """A GraphStore pre-loaded with sample_nodes and sample_edges."""
    for node_id, node_type, data in sample_nodes:
        graph_store.upsert_node(node_id, node_type, data)
    for source, target, rel_type, data, confidence in sample_edges:
        graph_store.upsert_edge(source, target, rel_type, data, confidence)
    return graph_store


# ---------------------------------------------------------------------------
# Schema validator fixture
# ---------------------------------------------------------------------------

@pytest.fixture()
def schema_validator():
    """Return a SchemaValidator loaded from the project's graph/schema.json."""
    schema_path = str(PROJECT_ROOT / "graph" / "schema.json")
    return SchemaValidator(schema_path=schema_path)


# ---------------------------------------------------------------------------
# Skill registry fixture
# ---------------------------------------------------------------------------

@pytest.fixture()
def skill_registry():
    """Return a SkillRegistry pointed at the project's .claude/skills/ directory.

    The registry is scanned during fixture creation so tests can immediately
    query it.
    """
    registry = SkillRegistry(project_root=str(PROJECT_ROOT))
    registry.scan()
    return registry
