from axisrobo_harmovela_agent import AGENT_EVENT_TYPES, is_agent_event_type


def test_agent_event_types_includes_all_6_registry_entries():
    expected = {
        "agent.message.sent",
        "agent.message.received",
        "agent.message.failed",
        "agent.request.created",
        "agent.response.created",
        "agent.decision.recorded",
    }
    assert AGENT_EVENT_TYPES == expected
    assert len(AGENT_EVENT_TYPES) == 6


def test_is_agent_event_type_positives():
    assert is_agent_event_type("agent.message.sent") is True
    assert is_agent_event_type("agent.message.received") is True
    assert is_agent_event_type("agent.message.failed") is True
    assert is_agent_event_type("agent.request.created") is True
    assert is_agent_event_type("agent.response.created") is True
    assert is_agent_event_type("agent.decision.recorded") is True


def test_is_agent_event_type_negatives():
    assert is_agent_event_type("task.submitted") is False
    assert is_agent_event_type("session.opened") is False
    assert is_agent_event_type("context.updated") is False
    assert is_agent_event_type("") is False
