import os
import uuid
import pytest
from aep.postgres_delivery_store import PostgresDeliveryStore


def _url() -> str:
    return os.environ.get("AEP_POSTGRES_URL", "postgres://postgres:postgres@localhost:5433/postgres")


@pytest.fixture
def store():
    prefix = "test_" + uuid.uuid4().hex[:12]
    s = PostgresDeliveryStore(_url(), stream_id="stream_01", table_prefix=prefix, drop_on_close=True)
    yield s
    s.close()


def test_track_and_ack(store):
    seq = store.track("evt_001", "sub_01")
    assert seq == 1
    assert store.is_pending("evt_001")
    assert not store.is_acknowledged("evt_001")
    assert store.ack("evt_001")
    assert store.is_acknowledged("evt_001")
    assert not store.is_pending("evt_001")


def test_nack(store):
    store.track("evt_001", "sub_01")
    attempts = store.nack("evt_001")
    assert attempts == 2


def test_dead_letter(store):
    store.track("evt_001", "sub_01")
    dlq = store.dead_letter("evt_001", {"error": {"code": "timeout"}})
    assert dlq is not None
    assert dlq["type"] == "event.dead_lettered"
    assert not store.is_pending("evt_001")


def test_stats(store):
    store.track("evt_a", "sub_01")
    store.track("evt_b", "sub_01")
    store.ack("evt_a")
    store.track("evt_c", "sub_02")
    store.dead_letter("evt_c")
    stats = store.get_stats()
    assert stats["totalSequences"] == 3
    assert stats["pending"] == 1
    assert stats["acknowledged"] == 1
    assert stats["deadLettered"] == 1


def test_get_pending_for_subscription(store):
    store.track("evt_a", "sub_01")
    store.track("evt_b", "sub_02")
    store.track("evt_c", "sub_01")
    assert len(store.get_pending_for_subscription("sub_01")) == 2


def test_has_attempts_remaining(store):
    store.track("evt_001", "sub_01")
    assert store.has_attempts_remaining("evt_001", 3)
    store.nack("evt_001")
    store.nack("evt_001")
    assert not store.has_attempts_remaining("evt_001", 3)


def test_lists_dead_lettered_records(store):
    store.track("evt_1", "sub_01")
    store.dead_letter("evt_1", {"error": {"code": "timeout"}})
    records = store.get_dead_lettered()
    assert len(records) == 1
    assert records[0]["eventId"] == "evt_1"
    assert records[0]["reason"]["error"]["code"] == "timeout"


def test_subscription_crud(store):
    store.create_subscription({"id": "sub_1", "filter": {"types": "task.*"}, "created_at": "2026-07-11T10:00:00Z"})
    assert store.get_subscription("sub_1")["filter"]["types"] == "task.*"
    assert len(store.list_subscriptions()) == 1
    assert store.delete_subscription("sub_1") is True
    assert store.get_subscription("sub_1") is None
    assert store.delete_subscription("sub_1") is False
