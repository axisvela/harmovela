from axisrobo_harmovela_environment import ENVIRONMENT_EVENT_TYPES, is_environment_event_type


def test_environment_event_types_includes_all_4_registry_entries():
    expected = {
        "environment.observed",
        "environment.changed",
        "environment.alerted",
        "environment.error",
    }
    assert ENVIRONMENT_EVENT_TYPES == expected
    assert len(ENVIRONMENT_EVENT_TYPES) == 4


def test_is_environment_event_type_positives():
    assert is_environment_event_type("environment.observed") is True
    assert is_environment_event_type("environment.changed") is True
    assert is_environment_event_type("environment.alerted") is True
    assert is_environment_event_type("environment.error") is True


def test_is_environment_event_type_negatives():
    assert is_environment_event_type("task.submitted") is False
    assert is_environment_event_type("session.opened") is False
    assert is_environment_event_type("context.updated") is False
    assert is_environment_event_type("") is False
