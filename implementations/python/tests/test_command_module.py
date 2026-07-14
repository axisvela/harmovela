import pytest
from axisrobo_harmovela_command import COMMAND_EVENT_TYPES, is_command_event_type


def test_command_event_types_includes_all_5_entries():
    expected = [
        "command.requested",
        "command.accepted",
        "command.rejected",
        "command.completed",
        "command.failed",
    ]
    for t in expected:
        assert t in COMMAND_EVENT_TYPES, f"missing: {t}"
    assert len(COMMAND_EVENT_TYPES) == len(expected)


def test_is_command_event_type_positives():
    assert is_command_event_type("command.requested") is True
    assert is_command_event_type("command.accepted") is True
    assert is_command_event_type("command.rejected") is True
    assert is_command_event_type("command.completed") is True
    assert is_command_event_type("command.failed") is True


def test_is_command_event_type_negatives():
    assert is_command_event_type("task.submitted") is False
    assert is_command_event_type("session.opened") is False
    assert is_command_event_type("query.requested") is False
    assert is_command_event_type("") is False
