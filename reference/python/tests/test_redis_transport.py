import json
import pytest
from aep.transport.redis import RedisTransport

def test_stream_key_routing():
    t = RedisTransport(prefix="aep")
    assert t.stream_key({"type": "task.progress"}) == "aep.type.task.progress"
    assert t.stream_key({"source": "sensor:a"}) == "aep.source.sensor:a"
    assert t.stream_key({}) == "aep.events"

def test_consumer_group():
    t = RedisTransport()
    assert t.consumer_group({"session_id": "sess_01"}) == "aep-sess_01"
    assert t.consumer_group({}) == "aep-default"

def test_entry_fields():
    t = RedisTransport()
    fields = t.entry_fields({
        "type": "task.submitted", "source": "agent:researcher",
        "session_id": "sess_01", "conversation_id": "conv_01",
        "task_id": "task_01", "correlation_id": "corr_01",
        "causation_id": "evt_001", "delivery": {"mode": "at_least_once"},
    })
    assert fields["aep-type"] == "task.submitted"
    assert fields["aep-source"] == "agent:researcher"
    assert fields["aep-session"] == "sess_01"
    assert fields["aep-conversation"] == "conv_01"
    assert fields["aep-task"] == "task_01"
    assert fields["aep-correlation"] == "corr_01"
    assert fields["aep-causation"] == "evt_001"
    assert fields["aep-delivery-mode"] == "at_least_once"
    assert json.loads(fields["body"])["task_id"] == "task_01"
    assert len(fields) == 9

def test_constructor_defaults():
    t = RedisTransport()
    assert t.addr == "localhost:6379"
    assert t.stream == "aep.events"
    assert t.prefix == "aep"
    assert not t.is_running

def test_custom_prefix():
    t = RedisTransport(prefix="custom")
    assert t.stream_key({"type": "test"}) == "custom.type.test"

def test_send_requires_started():
    t = RedisTransport()
    with pytest.raises(RuntimeError, match="not started"):
        t.send({"type": "test"})

def test_json_roundtrip():
    event = {"aep_version": "0.1", "id": "evt_001", "type": "test", "source": "test", "created_at": "2026-07-10T10:00:00Z", "payload": {}}
    data = json.dumps(event)
    parsed = json.loads(data)
    assert parsed["id"] == "evt_001"
