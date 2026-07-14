from axisrobo_harmovela_tool import TOOL_EVENT_TYPES, is_tool_event_type


def test_tool_event_types_includes_all_11_registry_entries():
    expected = {
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
    }
    assert TOOL_EVENT_TYPES == expected
    assert len(TOOL_EVENT_TYPES) == 11


def test_is_tool_event_type_positives():
    assert is_tool_event_type("tool.call.requested") is True
    assert is_tool_event_type("tool.call.accepted") is True
    assert is_tool_event_type("tool.call.started") is True
    assert is_tool_event_type("tool.call.progress") is True
    assert is_tool_event_type("tool.call.completed") is True
    assert is_tool_event_type("tool.call.failed") is True
    assert is_tool_event_type("tool.call.cancelled") is True
    assert is_tool_event_type("tool.call.timed_out") is True


def test_is_tool_event_type_negatives():
    assert is_tool_event_type("task.submitted") is False
    assert is_tool_event_type("session.opened") is False
    assert is_tool_event_type("context.updated") is False
    assert is_tool_event_type("") is False
