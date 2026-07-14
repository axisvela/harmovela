STATE_EVENT_TYPES = frozenset({
    "state.snapshot.requested",
    "state.snapshot.ready",
    "state.delta.applied",
    "state.invalidated",
    "freshness.expired",
    "freshness.window.changed",
})


def is_state_event_type(type_: str) -> bool:
    return type_ in STATE_EVENT_TYPES
