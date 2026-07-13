STANDARD_EVENT_TYPES = frozenset({
    "session.opened",
    "session.ready",
    "session.heartbeat",
    "session.closed",
    "session.error",
    "capabilities.requested",
    "capabilities.declared",
    "capabilities.changed",
    "subscription.requested",
    "subscription.created",
    "subscription.rejected",
    "subscription.cancelled",
    "subscription.expired",
})


def is_standard_event_type(type_: str) -> bool:
    return type_ in STANDARD_EVENT_TYPES
