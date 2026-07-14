import pytest
from axisrobo_harmovela_query import QUERY_EVENT_TYPES, is_query_event_type


def test_query_event_types_includes_all_4_entries():
    expected = [
        "query.requested",
        "query.response",
        "query.rejected",
        "query.error",
    ]
    for t in expected:
        assert t in QUERY_EVENT_TYPES, f"missing: {t}"
    assert len(QUERY_EVENT_TYPES) == len(expected)


def test_is_query_event_type_positives():
    assert is_query_event_type("query.requested") is True
    assert is_query_event_type("query.response") is True
    assert is_query_event_type("query.rejected") is True
    assert is_query_event_type("query.error") is True


def test_is_query_event_type_negatives():
    assert is_query_event_type("task.submitted") is False
    assert is_query_event_type("session.opened") is False
    assert is_query_event_type("command.requested") is False
    assert is_query_event_type("") is False
