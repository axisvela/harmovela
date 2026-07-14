CONTEXT_MEMORY_EVENT_TYPES = frozenset({
    "context.updated",
    "context.invalidated",
    "context.snapshot.requested",
    "context.snapshot.ready",
    "context.retrieval.started",
    "context.retrieval.completed",
    "context.retrieval.failed",
    "memory.fact.added",
    "memory.fact.updated",
    "memory.fact.invalidated",
    "memory.episode.stored",
    "memory.preference.updated",
    "memory.constraint.updated",
    "memory.summary.ready",
    "memory.retrieval.ready",
})


def is_context_memory_event_type(type_: str) -> bool:
    return type_ in CONTEXT_MEMORY_EVENT_TYPES


__all__ = ["CONTEXT_MEMORY_EVENT_TYPES", "is_context_memory_event_type"]
