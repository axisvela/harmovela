AGENT_EVENT_TYPES = frozenset({
    "agent.message.sent",
    "agent.message.received",
    "agent.message.failed",
    "agent.request.created",
    "agent.response.created",
    "agent.decision.recorded",
})


def is_agent_event_type(type_: str) -> bool:
    return type_ in AGENT_EVENT_TYPES


__all__ = ["AGENT_EVENT_TYPES", "is_agent_event_type"]
