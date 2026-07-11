from aep.delivery_store import InMemoryDeliveryStore


def test_tracks_and_acknowledges_events():
    store = InMemoryDeliveryStore()
    seq = store.track("evt_001", "sub_01")
    assert seq == 1
    assert store.is_pending("evt_001") is True
    assert store.is_acknowledged("evt_001") is False
    acked = store.ack("evt_001")
    assert acked is True
    assert store.is_acknowledged("evt_001") is True
    assert store.is_pending("evt_001") is False


def test_nacks_and_increments_attempts():
    store = InMemoryDeliveryStore()
    store.track("evt_001", "sub_01")
    attempts = store.nack("evt_001")
    assert attempts == 2
    pending = store.get_pending()
    assert len(pending) == 1
    assert pending[0]["attempts"] == 2


def test_dead_letters_exhausted_events():
    store = InMemoryDeliveryStore()
    store.track("evt_001", "sub_01")
    dlq = store.dead_letter("evt_001", {"error": {"code": "timeout", "message": "no ack"}})
    assert dlq is not None
    assert dlq["payload"]["attempts"] == 1
    assert dlq["payload"]["original_event_id"] == "evt_001"
    assert store.is_pending("evt_001") is False


def test_provides_stats():
    store = InMemoryDeliveryStore()
    store.track("evt_a", "sub_01")
    store.track("evt_b", "sub_01")
    store.ack("evt_a")
    store.track("evt_c", "sub_02")
    store.dead_letter("evt_c", {})
    stats = store.get_stats()
    assert stats["totalSequences"] == 3
    assert stats["pending"] == 1
    assert stats["acknowledged"] == 1
    assert stats["deadLettered"] == 1


def test_nack_returns_false_for_unknown_events():
    store = InMemoryDeliveryStore()
    assert store.nack("nonexistent") is False


def test_dead_letter_returns_none_for_unknown_events():
    store = InMemoryDeliveryStore()
    assert store.dead_letter("nonexistent") is None


def test_has_attempts_remaining_checks_max():
    store = InMemoryDeliveryStore()
    store.track("evt_001", "sub_01")
    assert store.has_attempts_remaining("evt_001", 3) is True
    store.nack("evt_001")
    store.nack("evt_001")
    assert store.has_attempts_remaining("evt_001", 3) is False


def test_get_pending_for_subscription_filters():
    store = InMemoryDeliveryStore()
    store.track("evt_a", "sub_01")
    store.track("evt_b", "sub_02")
    store.track("evt_c", "sub_01")
    filtered = store.get_pending_for_subscription("sub_01")
    assert len(filtered) == 2
    assert [e["eventId"] for e in filtered] == ["evt_a", "evt_c"]


def test_lists_dead_lettered_records():
    store = InMemoryDeliveryStore()
    store.track("evt_1", "sub_01")
    store.dead_letter("evt_1", {"error": {"code": "timeout"}})
    records = store.get_dead_lettered()
    assert len(records) == 1
    assert records[0]["eventId"] == "evt_1"
    assert records[0]["reason"]["error"]["code"] == "timeout"


def test_subscription_crud():
    store = InMemoryDeliveryStore()
    store.create_subscription({"id": "sub_1", "filter": {"types": "task.*"}, "created_at": "2026-07-11T10:00:00Z"})
    assert store.get_subscription("sub_1")["filter"]["types"] == "task.*"
    assert len(store.list_subscriptions()) == 1
    assert store.delete_subscription("sub_1") is True
    assert store.get_subscription("sub_1") is None
    assert store.delete_subscription("sub_1") is False
