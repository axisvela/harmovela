DELEGATION_EVENT_TYPES = frozenset({
    "delegation.requested",
    "delegation.accepted",
    "delegation.rejected",
    "delegation.handoff.completed",
    "delegation.escalated",
})


def is_delegation_event_type(type_: str) -> bool:
    return type_ in DELEGATION_EVENT_TYPES


__all__ = ["DELEGATION_EVENT_TYPES", "is_delegation_event_type"]
