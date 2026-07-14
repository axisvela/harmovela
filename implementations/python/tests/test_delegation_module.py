from axisrobo_harmovela_delegation import DELEGATION_EVENT_TYPES, is_delegation_event_type


def test_delegation_event_types_includes_all_5_registry_entries():
    expected = {
        "delegation.requested",
        "delegation.accepted",
        "delegation.rejected",
        "delegation.handoff.completed",
        "delegation.escalated",
    }
    assert DELEGATION_EVENT_TYPES == expected
    assert len(DELEGATION_EVENT_TYPES) == 5


def test_is_delegation_event_type_positives():
    assert is_delegation_event_type("delegation.requested") is True
    assert is_delegation_event_type("delegation.accepted") is True
    assert is_delegation_event_type("delegation.handoff.completed") is True
    assert is_delegation_event_type("delegation.escalated") is True


def test_is_delegation_event_type_negatives():
    assert is_delegation_event_type("task.submitted") is False
    assert is_delegation_event_type("session.opened") is False
    assert is_delegation_event_type("context.updated") is False
    assert is_delegation_event_type("") is False
