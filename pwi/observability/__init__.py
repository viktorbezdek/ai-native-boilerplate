"""PWI Observability -- health checks and metrics collection.

Provides two main classes:

* :class:`HealthCheck` -- validates system components (skills, graph, MCP,
  hooks, logs, environment variables).
* :class:`MetricsCollector` -- aggregates execution metrics from JSONL logs
  and the knowledge-graph database.

Quick start::

    from pwi.observability import HealthCheck, MetricsCollector

    # Health check
    hc = HealthCheck(project_root="/path/to/project")
    report = hc.check_all()
    print(report["overall_status"])  # "ok", "warn", or "error"

    # Metrics
    mc = MetricsCollector(log_dir="./logs")
    print(mc.generate_report())
"""

from .health import HealthCheck
from .metrics import MetricsCollector

__all__ = ["HealthCheck", "MetricsCollector"]
