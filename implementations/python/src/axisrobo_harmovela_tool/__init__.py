TOOL_EVENT_TYPES = frozenset({
    "tool.call.requested",
    "tool.call.accepted",
    "tool.call.rejected",
    "tool.call.started",
    "tool.call.progress",
    "tool.call.output",
    "tool.call.completed",
    "tool.call.failed",
    "tool.call.cancel.requested",
    "tool.call.cancelled",
    "tool.call.timed_out",
})


def is_tool_event_type(type_: str) -> bool:
    return type_ in TOOL_EVENT_TYPES


__all__ = ["TOOL_EVENT_TYPES", "is_tool_event_type"]
