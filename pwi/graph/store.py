"""Persistent knowledge graph using SQLite for storage and NetworkX for analysis.

This module provides the GraphStore class, which combines SQLite for durable
persistence with NetworkX for in-memory graph algorithms and analysis.
"""

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

import networkx as nx


class GraphStore:
    """Persistent knowledge graph using SQLite for storage and NetworkX for analysis."""

    def __init__(self, db_path: str = "./graph/pwi.db"):
        """Initialize the database and create tables if they do not exist.

        Args:
            db_path: File path for the SQLite database.  Parent directories
                     are created automatically if they do not already exist.
        """
        self._db_path = Path(db_path)
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(self._db_path))
        self._conn.row_factory = sqlite3.Row
        # Enable WAL mode for better concurrent read performance.
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._init_tables()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _init_tables(self):
        """Create the nodes and edges tables if they do not already exist."""
        self._conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS nodes (
                id         TEXT PRIMARY KEY,
                type       TEXT NOT NULL,
                data       TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type);

            CREATE TABLE IF NOT EXISTS edges (
                source     TEXT NOT NULL,
                target     TEXT NOT NULL,
                rel_type   TEXT NOT NULL,
                data       TEXT NOT NULL DEFAULT '{}',
                confidence REAL NOT NULL DEFAULT 1.0,
                created_at TEXT NOT NULL,
                PRIMARY KEY (source, target, rel_type)
            );

            CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source);
            CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target);
            CREATE INDEX IF NOT EXISTS idx_edges_rel_type ON edges(rel_type);
            """
        )
        self._conn.commit()

    @staticmethod
    def _now() -> str:
        """Return the current UTC time as an ISO-8601 string."""
        return datetime.now(timezone.utc).isoformat()

    @staticmethod
    def _row_to_node(row: sqlite3.Row) -> dict:
        """Convert a database row into a node dictionary."""
        return {
            "id": row["id"],
            "type": row["type"],
            "data": json.loads(row["data"]),
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }

    @staticmethod
    def _row_to_edge(row: sqlite3.Row) -> dict:
        """Convert a database row into an edge dictionary."""
        return {
            "source": row["source"],
            "target": row["target"],
            "rel_type": row["rel_type"],
            "data": json.loads(row["data"]),
            "confidence": row["confidence"],
            "created_at": row["created_at"],
        }

    # ------------------------------------------------------------------
    # Node operations
    # ------------------------------------------------------------------

    def upsert_node(self, node_id: str, node_type: str, data: dict) -> bool:
        """Insert or update a node.

        Args:
            node_id: Unique identifier for the node.
            node_type: Entity type (e.g. ``"message"``, ``"contact"``).
            data: Arbitrary JSON-serialisable data payload.

        Returns:
            ``True`` if a new node was created, ``False`` if an existing node
            was updated.
        """
        now = self._now()
        data_json = json.dumps(data, default=str)

        existing = self._conn.execute(
            "SELECT 1 FROM nodes WHERE id = ?", (node_id,)
        ).fetchone()

        if existing is None:
            self._conn.execute(
                "INSERT INTO nodes (id, type, data, created_at, updated_at) "
                "VALUES (?, ?, ?, ?, ?)",
                (node_id, node_type, data_json, now, now),
            )
            self._conn.commit()
            return True
        else:
            self._conn.execute(
                "UPDATE nodes SET type = ?, data = ?, updated_at = ? WHERE id = ?",
                (node_type, data_json, now, node_id),
            )
            self._conn.commit()
            return False

    def get_node(self, node_id: str) -> dict | None:
        """Get a single node by its ID.

        Args:
            node_id: The node identifier.

        Returns:
            A node dictionary, or ``None`` if not found.
        """
        row = self._conn.execute(
            "SELECT * FROM nodes WHERE id = ?", (node_id,)
        ).fetchone()
        if row is None:
            return None
        return self._row_to_node(row)

    def get_nodes_by_type(self, node_type: str) -> list[dict]:
        """Get all nodes of a given type.

        Args:
            node_type: The entity type to filter on.

        Returns:
            List of node dictionaries.
        """
        rows = self._conn.execute(
            "SELECT * FROM nodes WHERE type = ?", (node_type,)
        ).fetchall()
        return [self._row_to_node(r) for r in rows]

    def search_nodes(self, query: str, node_type: str = None) -> list[dict]:
        """Full-text search across node data JSON.

        Performs a case-insensitive LIKE search on the serialised JSON ``data``
        column.  Optionally restricts results to a single node type.

        Args:
            query: The search term.
            node_type: Optional entity type filter.

        Returns:
            List of matching node dictionaries.
        """
        like_pattern = f"%{query}%"
        if node_type is not None:
            rows = self._conn.execute(
                "SELECT * FROM nodes WHERE type = ? AND data LIKE ?",
                (node_type, like_pattern),
            ).fetchall()
        else:
            rows = self._conn.execute(
                "SELECT * FROM nodes WHERE data LIKE ?", (like_pattern,)
            ).fetchall()
        return [self._row_to_node(r) for r in rows]

    def delete_node(self, node_id: str):
        """Delete a node and all edges that reference it.

        Args:
            node_id: The node identifier to remove.
        """
        self._conn.execute("DELETE FROM nodes WHERE id = ?", (node_id,))
        self._conn.execute(
            "DELETE FROM edges WHERE source = ? OR target = ?",
            (node_id, node_id),
        )
        self._conn.commit()

    # ------------------------------------------------------------------
    # Edge operations
    # ------------------------------------------------------------------

    def upsert_edge(
        self,
        source: str,
        target: str,
        rel_type: str,
        data: dict = None,
        confidence: float = 1.0,
    ):
        """Insert or update an edge.

        The primary key is the tuple ``(source, target, rel_type)``.  If an
        edge with the same key already exists it will be replaced.

        Args:
            source: Source node ID.
            target: Target node ID.
            rel_type: Relationship type label.
            data: Optional JSON-serialisable metadata.
            confidence: Confidence score in ``[0, 1]``.
        """
        now = self._now()
        data_json = json.dumps(data or {}, default=str)
        self._conn.execute(
            "INSERT OR REPLACE INTO edges "
            "(source, target, rel_type, data, confidence, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (source, target, rel_type, data_json, confidence, now),
        )
        self._conn.commit()

    def get_edges(self, node_id: str, direction: str = "both") -> list[dict]:
        """Get edges connected to a node.

        Args:
            node_id: The node to query edges for.
            direction: One of ``"outgoing"``, ``"incoming"``, or ``"both"``.

        Returns:
            List of edge dictionaries.
        """
        if direction == "outgoing":
            rows = self._conn.execute(
                "SELECT * FROM edges WHERE source = ?", (node_id,)
            ).fetchall()
        elif direction == "incoming":
            rows = self._conn.execute(
                "SELECT * FROM edges WHERE target = ?", (node_id,)
            ).fetchall()
        else:  # both
            rows = self._conn.execute(
                "SELECT * FROM edges WHERE source = ? OR target = ?",
                (node_id, node_id),
            ).fetchall()
        return [self._row_to_edge(r) for r in rows]

    # ------------------------------------------------------------------
    # NetworkX interop
    # ------------------------------------------------------------------

    def to_networkx(self) -> nx.DiGraph:
        """Export the entire graph to a NetworkX ``DiGraph``.

        Node attributes include ``type``, ``data``, ``created_at``, and
        ``updated_at``.  Edge attributes include ``rel_type``, ``data``,
        ``confidence``, and ``created_at``.

        Returns:
            A populated ``networkx.DiGraph``.
        """
        G = nx.DiGraph()

        for row in self._conn.execute("SELECT * FROM nodes").fetchall():
            node = self._row_to_node(row)
            G.add_node(
                node["id"],
                type=node["type"],
                data=node["data"],
                created_at=node["created_at"],
                updated_at=node["updated_at"],
            )

        for row in self._conn.execute("SELECT * FROM edges").fetchall():
            edge = self._row_to_edge(row)
            G.add_edge(
                edge["source"],
                edge["target"],
                rel_type=edge["rel_type"],
                data=edge["data"],
                confidence=edge["confidence"],
                created_at=edge["created_at"],
            )

        return G

    def from_networkx(self, G: nx.DiGraph):
        """Import nodes and edges from a NetworkX ``DiGraph``.

        All nodes and edges are upserted, so this can be used for both initial
        import and incremental updates.

        Args:
            G: The NetworkX directed graph to import.
        """
        for node_id, attrs in G.nodes(data=True):
            node_type = attrs.get("type", "unknown")
            data = attrs.get("data", {})
            # If the caller stored flat attributes (not wrapped in "data"),
            # collect them.
            if not data:
                data = {
                    k: v
                    for k, v in attrs.items()
                    if k not in ("type", "data", "created_at", "updated_at")
                }
            self.upsert_node(str(node_id), node_type, data)

        for source, target, attrs in G.edges(data=True):
            rel_type = attrs.get("rel_type", "related_to")
            data = attrs.get("data", {})
            confidence = attrs.get("confidence", 1.0)
            self.upsert_edge(str(source), str(target), rel_type, data, confidence)

    # ------------------------------------------------------------------
    # Import / Export
    # ------------------------------------------------------------------

    def export_json(self, path: str):
        """Export the graph as JSON in node-link format.

        The output file contains a dictionary with ``"nodes"`` and ``"edges"``
        top-level keys.

        Args:
            path: Destination file path.
        """
        nodes = []
        for row in self._conn.execute("SELECT * FROM nodes").fetchall():
            nodes.append(self._row_to_node(row))

        edges = []
        for row in self._conn.execute("SELECT * FROM edges").fetchall():
            edges.append(self._row_to_edge(row))

        output = {"nodes": nodes, "edges": edges}
        out_path = Path(path)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w") as f:
            json.dump(output, f, indent=2, default=str)

    def import_json(self, path: str):
        """Import a graph from a JSON file in node-link format.

        Expects the same structure produced by :meth:`export_json`.

        Args:
            path: Source file path.
        """
        with open(path, "r") as f:
            data = json.load(f)

        for node in data.get("nodes", []):
            self.upsert_node(node["id"], node["type"], node.get("data", {}))

        for edge in data.get("edges", []):
            self.upsert_edge(
                edge["source"],
                edge["target"],
                edge["rel_type"],
                edge.get("data", {}),
                edge.get("confidence", 1.0),
            )

    # ------------------------------------------------------------------
    # Statistics
    # ------------------------------------------------------------------

    def get_stats(self) -> dict:
        """Return summary statistics about the graph.

        Returns:
            Dictionary with ``node_count``, ``edge_count``,
            ``node_type_distribution``, ``edge_type_distribution``, and
            ``last_updated``.
        """
        node_count = self._conn.execute(
            "SELECT COUNT(*) AS cnt FROM nodes"
        ).fetchone()["cnt"]

        edge_count = self._conn.execute(
            "SELECT COUNT(*) AS cnt FROM edges"
        ).fetchone()["cnt"]

        node_types = {}
        for row in self._conn.execute(
            "SELECT type, COUNT(*) AS cnt FROM nodes GROUP BY type"
        ).fetchall():
            node_types[row["type"]] = row["cnt"]

        edge_types = {}
        for row in self._conn.execute(
            "SELECT rel_type, COUNT(*) AS cnt FROM edges GROUP BY rel_type"
        ).fetchall():
            edge_types[row["rel_type"]] = row["cnt"]

        last_updated_row = self._conn.execute(
            "SELECT MAX(updated_at) AS last FROM nodes"
        ).fetchone()
        last_updated = last_updated_row["last"] if last_updated_row else None

        return {
            "node_count": node_count,
            "edge_count": edge_count,
            "node_type_distribution": node_types,
            "edge_type_distribution": edge_types,
            "last_updated": last_updated,
        }

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def close(self):
        """Close the underlying database connection."""
        if self._conn:
            self._conn.close()
            self._conn = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
        return False
