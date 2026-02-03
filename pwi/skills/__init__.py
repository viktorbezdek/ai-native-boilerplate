"""PWI skill runtime -- executor, registry, and result types.

Quick start::

    from pwi.skills import SkillExecutor, SkillRegistry, SkillResult

    registry = SkillRegistry(project_root="/path/to/project")
    registry.scan()

    executor = SkillExecutor(graph_store={}, registry=registry)
    result = await executor.execute("stale-detection", {"since": "7d"})
"""

from .executor import SkillExecutor
from .registry import SkillDescriptor, SkillRegistry, SkillValidationError
from .result import SkillResult

__all__ = [
    "SkillDescriptor",
    "SkillExecutor",
    "SkillRegistry",
    "SkillResult",
    "SkillValidationError",
]
