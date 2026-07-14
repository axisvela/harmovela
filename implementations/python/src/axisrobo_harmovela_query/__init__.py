QUERY_EVENT_TYPES = frozenset({
    "query.requested",
    "query.response",
    "query.rejected",
    "query.error",
})


def is_query_event_type(type_: str) -> bool:
    return type_ in QUERY_EVENT_TYPES


__all__ = ["QUERY_EVENT_TYPES", "is_query_event_type"]
