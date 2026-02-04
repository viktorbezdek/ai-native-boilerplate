"""Tests for the GraphStore persistent knowledge graph.

Covers CRUD operations for nodes and edges, cascading deletes, search,
NetworkX round-tripping, JSON import/export, statistics, and context manager
usage.
"""

import json
import os
import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from pwi.graph.store import GraphStore


# ------------------------------------------------------------------
# Node CRUD
# ------------------------------------------------------------------


class TestNodeOperations:
    """Tests for node create, read, update, and delete."""

    def test_create_node(self, graph_store):
        """Upserting a new node stores it and it can be retrieved."""
        graph_store.upsert_node("n1", "message", {"text": "hello"})
        node = graph_store.get_node("n1")

        assert node is not None
        assert node["id"] == "n1"
        assert node["type"] == "message"
        assert node["data"]["text"] == "hello"
        assert "created_at" in node
        assert "updated_at" in node

    def test_upsert_node_returns_true_on_create(self, graph_store):
        """upsert_node returns True when inserting a brand-new node."""
        result = graph_store.upsert_node("n1", "contact", {"email": "a@b.com"})
        assert result is True

    def test_upsert_node_returns_false_on_update(self, graph_store):
        """upsert_node returns False when updating an existing node."""
        graph_store.upsert_node("n1", "contact", {"email": "a@b.com"})
        result = graph_store.upsert_node("n1", "contact", {"email": "new@b.com"})
        assert result is False

        # Verify data was actually updated
        node = graph_store.get_node("n1")
        assert node["data"]["email"] == "new@b.com"

    def test_get_node_not_found_returns_none(self, graph_store):
        """Getting a non-existent node returns None rather than raising."""
        assert graph_store.get_node("does_not_exist") is None

    def test_get_nodes_by_type(self, populated_store):
        """get_nodes_by_type returns only nodes of the requested type."""
        messages = populated_store.get_nodes_by_type("message")
        assert len(messages) == 1
        assert messages[0]["type"] == "message"

        contacts = populated_store.get_nodes_by_type("contact")
        assert len(contacts) == 1
        assert contacts[0]["type"] == "contact"

        issues = populated_store.get_nodes_by_type("issue")
        assert len(issues) == 1
        assert issues[0]["data"]["key"] == "ENG-42"

    def test_delete_node_cascades_edges(self, populated_store):
        """Deleting a node also removes all edges that reference it."""
        # Confirm edges exist before deletion
        edges_before = populated_store.get_edges("alice@example.com")
        assert len(edges_before) >= 2

        # Delete the contact node
        populated_store.delete_node("alice@example.com")

        # Node should be gone
        assert populated_store.get_node("alice@example.com") is None

        # All edges referencing the deleted node should be gone
        edges_after = populated_store.get_edges("alice@example.com")
        assert len(edges_after) == 0


# ------------------------------------------------------------------
# Edge operations
# ------------------------------------------------------------------


class TestEdgeOperations:
    """Tests for edge upsert and directional retrieval."""

    def test_upsert_edge(self, graph_store):
        """Upserting an edge stores it and it can be retrieved."""
        graph_store.upsert_node("a", "contact", {})
        graph_store.upsert_node("b", "message", {})
        graph_store.upsert_edge("a", "b", "mentions", {"note": "test"}, 0.75)

        edges = graph_store.get_edges("a", direction="outgoing")
        assert len(edges) == 1
        assert edges[0]["source"] == "a"
        assert edges[0]["target"] == "b"
        assert edges[0]["rel_type"] == "mentions"
        assert edges[0]["data"]["note"] == "test"
        assert edges[0]["confidence"] == 0.75

    def test_get_edges_outgoing(self, populated_store):
        """get_edges with direction='outgoing' returns only edges from the node."""
        edges = populated_store.get_edges("alice@example.com", direction="outgoing")
        assert all(e["source"] == "alice@example.com" for e in edges)
        assert len(edges) == 2  # mentions + assigned_to

    def test_get_edges_incoming(self, populated_store):
        """get_edges with direction='incoming' returns only edges to the node."""
        edges = populated_store.get_edges("ENG-42", direction="incoming")
        assert all(e["target"] == "ENG-42" for e in edges)
        # alice -> ENG-42 (assigned_to) and msg -> ENG-42 (related_to)
        assert len(edges) == 2

    def test_get_edges_both(self, populated_store):
        """get_edges with direction='both' returns all connected edges."""
        edges = populated_store.get_edges("google-chat_msg001", direction="both")
        # incoming: alice -> msg (mentions), outgoing: msg -> ENG-42 (related_to)
        assert len(edges) == 2
        sources = {e["source"] for e in edges}
        targets = {e["target"] for e in edges}
        assert "google-chat_msg001" in sources | targets


# ------------------------------------------------------------------
# Search
# ------------------------------------------------------------------


class TestSearch:
    """Tests for full-text node search."""

    def test_search_nodes(self, populated_store):
        """search_nodes finds nodes whose data JSON contains the query string."""
        results = populated_store.search_nodes("deploy")
        assert len(results) >= 1
        # The message node mentions "deploy"
        found_ids = {r["id"] for r in results}
        assert "google-chat_msg001" in found_ids

    def test_search_nodes_by_type(self, populated_store):
        """search_nodes with a type filter restricts results to that type."""
        # "alice" appears in both message (sender) and contact (email/name) data
        all_results = populated_store.search_nodes("alice")
        contacts_only = populated_store.search_nodes("alice", node_type="contact")

        assert len(contacts_only) >= 1
        assert all(r["type"] == "contact" for r in contacts_only)
        # Unfiltered should return at least as many
        assert len(all_results) >= len(contacts_only)


# ------------------------------------------------------------------
# NetworkX round-trip
# ------------------------------------------------------------------


class TestNetworkX:
    """Tests for NetworkX export and import."""

    def test_to_networkx_roundtrip(self, populated_store, tmp_db):
        """Exporting to NetworkX and re-importing produces equivalent data."""
        G = populated_store.to_networkx()

        # Verify the graph has the right structure
        assert len(G.nodes) == 4  # 4 sample nodes
        assert len(G.edges) == 3  # 3 sample edges

        # Check node attributes
        assert G.nodes["ENG-42"]["type"] == "issue"
        assert G.nodes["alice@example.com"]["type"] == "contact"

        # Import into a fresh store
        fresh_db = tmp_db + "_roundtrip.db"
        fresh_store = GraphStore(db_path=fresh_db)
        try:
            fresh_store.from_networkx(G)

            # Verify all nodes came through
            stats = fresh_store.get_stats()
            assert stats["node_count"] == 4
            assert stats["edge_count"] == 3

            # Verify a specific node's data survived the round-trip
            node = fresh_store.get_node("ENG-42")
            assert node is not None
            assert node["data"]["summary"] == "Fix production deployment pipeline"
        finally:
            fresh_store.close()


# ------------------------------------------------------------------
# JSON import / export
# ------------------------------------------------------------------


class TestJsonRoundTrip:
    """Tests for JSON file export and import."""

    def test_export_import_json_roundtrip(self, populated_store, tmp_path):
        """Exporting to JSON and importing into a fresh store preserves data."""
        export_path = str(tmp_path / "graph_export.json")

        # Export
        populated_store.export_json(export_path)
        assert os.path.exists(export_path)

        # Verify the file structure
        with open(export_path) as f:
            data = json.load(f)
        assert "nodes" in data
        assert "edges" in data
        assert len(data["nodes"]) == 4
        assert len(data["edges"]) == 3

        # Import into a fresh store
        fresh_db = str(tmp_path / "fresh_import.db")
        fresh_store = GraphStore(db_path=fresh_db)
        try:
            fresh_store.import_json(export_path)

            stats = fresh_store.get_stats()
            assert stats["node_count"] == 4
            assert stats["edge_count"] == 3

            # Verify specific data
            node = fresh_store.get_node("asana_task_001")
            assert node is not None
            assert node["data"]["name"] == "Review Q1 roadmap"
        finally:
            fresh_store.close()


# ------------------------------------------------------------------
# Statistics
# ------------------------------------------------------------------


class TestStats:
    """Tests for graph statistics."""

    def test_get_stats(self, populated_store):
        """get_stats returns correct counts and distributions."""
        stats = populated_store.get_stats()

        assert stats["node_count"] == 4
        assert stats["edge_count"] == 3

        # Node type distribution
        assert stats["node_type_distribution"]["message"] == 1
        assert stats["node_type_distribution"]["issue"] == 1
        assert stats["node_type_distribution"]["task"] == 1
        assert stats["node_type_distribution"]["contact"] == 1

        # Edge type distribution
        assert stats["edge_type_distribution"]["mentions"] == 1
        assert stats["edge_type_distribution"]["assigned_to"] == 1
        assert stats["edge_type_distribution"]["related_to"] == 1

        # Last updated should be a non-empty string
        assert stats["last_updated"] is not None
        assert len(stats["last_updated"]) > 0


# ------------------------------------------------------------------
# Context manager
# ------------------------------------------------------------------


class TestContextManager:
    """Tests for using GraphStore as a context manager."""

    def test_context_manager(self, tmp_db):
        """GraphStore can be used with `with` and auto-closes the connection."""
        with GraphStore(db_path=tmp_db) as store:
            store.upsert_node("cm_node", "contact", {"email": "ctx@test.com"})
            node = store.get_node("cm_node")
            assert node is not None
            assert node["data"]["email"] == "ctx@test.com"

        # After exiting the context manager, the connection should be closed.
        # The internal _conn is set to None by close().
        assert store._conn is None
