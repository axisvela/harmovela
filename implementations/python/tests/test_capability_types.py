from axisrobo_harmovela_capability import CAPABILITY_EVENT_TYPES, is_capability_event_type


def test_capability_event_types_includes_all_entries():
    assert CAPABILITY_EVENT_TYPES == frozenset({
        "capability.registered",
        "capability.updated",
        "capability.deprecated",
        "capability.composed",
        "capability.validated",
    })


def test_is_capability_event_type_positives():
    for type_ in CAPABILITY_EVENT_TYPES:
        assert is_capability_event_type(type_)


def test_is_capability_event_type_negatives():
    assert not is_capability_event_type("capabilities.requested")
    assert not is_capability_event_type("task.submitted")
    assert not is_capability_event_type("")


def test_harness_accepts_capability_event_types():
    from harmovela_harness import is_legacy_dimension_event_type
    for type_ in CAPABILITY_EVENT_TYPES:
        assert is_legacy_dimension_event_type(type_)
