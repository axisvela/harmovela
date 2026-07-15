CAPABILITY_EVENT_TYPES = frozenset({
    "capability.registered",
    "capability.updated",
    "capability.deprecated",
    "capability.composed",
    "capability.validated",
})


def is_capability_event_type(type_: str) -> bool:
    return type_ in CAPABILITY_EVENT_TYPES


__all__ = ["CAPABILITY_EVENT_TYPES", "is_capability_event_type"]
