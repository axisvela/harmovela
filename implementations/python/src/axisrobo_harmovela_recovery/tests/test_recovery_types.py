from axisrobo_harmovela_recovery import RECOVERY_EVENT_TYPES, is_recovery_event_type


def test_recovery_event_types_includes_all_7_entries():
    expected = {
        "interruption.requested",
        "interruption.acknowledged",
        "interruption.saved",
        "interruption.resumed",
        "interruption.cancelled",
        "compensation.requested",
        "compensation.completed",
    }
    assert expected.issubset(RECOVERY_EVENT_TYPES)
    assert len(RECOVERY_EVENT_TYPES) == len(expected)


def test_is_recovery_event_type_positives():
    assert is_recovery_event_type("interruption.requested") is True
    assert is_recovery_event_type("interruption.acknowledged") is True
    assert is_recovery_event_type("interruption.saved") is True
    assert is_recovery_event_type("interruption.resumed") is True
    assert is_recovery_event_type("interruption.cancelled") is True
    assert is_recovery_event_type("compensation.requested") is True
    assert is_recovery_event_type("compensation.completed") is True


def test_is_recovery_event_type_negatives():
    assert is_recovery_event_type("task.submitted") is False
    assert is_recovery_event_type("session.opened") is False
    assert is_recovery_event_type("delegation.requested") is False
    assert is_recovery_event_type("") is False
