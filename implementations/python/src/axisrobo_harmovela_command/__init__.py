COMMAND_EVENT_TYPES = frozenset({
    "command.requested",
    "command.accepted",
    "command.rejected",
    "command.completed",
    "command.failed",
})


def is_command_event_type(type_: str) -> bool:
    return type_ in COMMAND_EVENT_TYPES


__all__ = ["COMMAND_EVENT_TYPES", "is_command_event_type"]
