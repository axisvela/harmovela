from axisrobo_harmovela_context import CONTEXT_MEMORY_EVENT_TYPES
from axisrobo_harmovela_delegation import DELEGATION_EVENT_TYPES
from axisrobo_harmovela_recovery import RECOVERY_EVENT_TYPES
from axisrobo_harmovela_state import STATE_EVENT_TYPES
from axisrobo_harmovela_tool import TOOL_EVENT_TYPES
from axisrobo_harmovela_agent import AGENT_EVENT_TYPES

LEGACY_DIMENSION_EVENT_TYPES = frozenset({
    "event.acknowledged", "event.rejected", "event.redelivered", "event.replayed", "event.dead_lettered",
    "task.submitted", "task.accepted", "task.started", "task.blocked", "task.progress",
    "task.output", "task.completed", "task.failed", "task.cancel.requested", "task.cancelled", "task.timed_out",
    "environment.observed", "environment.changed", "environment.alerted", "environment.error",
}.union(CONTEXT_MEMORY_EVENT_TYPES).union(DELEGATION_EVENT_TYPES).union(RECOVERY_EVENT_TYPES).union(STATE_EVENT_TYPES).union(TOOL_EVENT_TYPES).union(AGENT_EVENT_TYPES))


def is_legacy_dimension_event_type(type_: str) -> bool:
    return type_ in LEGACY_DIMENSION_EVENT_TYPES
