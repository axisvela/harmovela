from axisrobo_harmovela_context import CONTEXT_MEMORY_EVENT_TYPES, is_context_memory_event_type


def test_context_memory_event_types_includes_all_20_registry_entries():
    expected = {
        "context.updated",
        "context.invalidated",
        "context.snapshot.requested",
        "context.snapshot.ready",
        "context.retrieval.started",
        "context.retrieval.completed",
        "context.retrieval.failed",
        "memory.fact.added",
        "memory.fact.updated",
        "memory.fact.invalidated",
        "memory.episode.stored",
        "memory.preference.updated",
        "memory.constraint.updated",
        "memory.summary.ready",
        "memory.retrieval.ready",
        "belief.revised",
        "belief.conflict.detected",
        "provenance.attestation.added",
        "provenance.attestation.revoked",
        "provenance.chain.truncated",
    }
    assert CONTEXT_MEMORY_EVENT_TYPES == expected
    assert len(CONTEXT_MEMORY_EVENT_TYPES) == 20


def test_is_context_memory_event_type_positives():
    assert is_context_memory_event_type("context.updated") is True
    assert is_context_memory_event_type("context.invalidated") is True
    assert is_context_memory_event_type("memory.fact.added") is True
    assert is_context_memory_event_type("memory.retrieval.ready") is True
    assert is_context_memory_event_type("belief.revised") is True
    assert is_context_memory_event_type("belief.conflict.detected") is True
    assert is_context_memory_event_type("provenance.attestation.added") is True
    assert is_context_memory_event_type("provenance.attestation.revoked") is True
    assert is_context_memory_event_type("provenance.chain.truncated") is True


def test_is_context_memory_event_type_negatives():
    assert is_context_memory_event_type("task.submitted") is False
    assert is_context_memory_event_type("session.opened") is False
    assert is_context_memory_event_type("state.delta.applied") is False
    assert is_context_memory_event_type("") is False
