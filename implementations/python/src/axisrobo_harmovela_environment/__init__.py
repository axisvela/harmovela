ENVIRONMENT_EVENT_TYPES = frozenset({
    "environment.observed",
    "environment.changed",
    "environment.alerted",
    "environment.error",
})


def is_environment_event_type(type_: str) -> bool:
    return type_ in ENVIRONMENT_EVENT_TYPES


__all__ = ["ENVIRONMENT_EVENT_TYPES", "is_environment_event_type"]
