import json
import pytest
from aep.transport.kafka import KafkaTransport

def test_message_key_priority():
    t = KafkaTransport()
    assert t.message_key({"task_id": "task_01", "conversation_id": "conv_01", "session_id": "sess_01", "source": "agent:x"}) == "task_01"
    assert t.message_key({"conversation_id": "conv_01", "session_id": "sess_01"}) == "conv_01"
    assert t.message_key({"session_id": "sess_01"}) == "sess_01"
    assert t.message_key({"source": "agent:researcher"}) == "agent:researcher"
    assert t.message_key({}) == ""

def test_target_topic_routing():
    t = KafkaTransport(prefix="aep")
    assert t.target_topic({"type": "task.progress"}) == "aep.type.task.progress"
    assert t.target_topic({"source": "sensor:a"}) == "aep.source.sensor:a"
    assert t.target_topic({}) == "aep.events"

def test_message_headers():
    t = KafkaTransport()
    headers = t.message_headers({
        "type": "task.submitted", "source": "agent:researcher",
        "session_id": "sess_01", "conversation_id": "conv_01",
        "task_id": "task_01", "correlation_id": "corr_01",
        "causation_id": "evt_001", "delivery": {"mode": "at_least_once"},
    })
    assert headers["aep-type"] == "task.submitted"
    assert headers["aep-source"] == "agent:researcher"
    assert headers["aep-session"] == "sess_01"
    assert headers["aep-conversation"] == "conv_01"
    assert headers["aep-task"] == "task_01"
    assert headers["aep-correlation"] == "corr_01"
    assert headers["aep-causation"] == "evt_001"
    assert headers["aep-delivery-mode"] == "at_least_once"
    assert len(headers) == 8

def test_constructor_defaults():
    t = KafkaTransport()
    assert t.brokers == ["localhost:9092"]
    assert t.topic == "aep.events"
    assert t.prefix == "aep"
    assert not t.is_running

def test_custom_prefix():
    t = KafkaTransport(prefix="custom")
    assert t.target_topic({"type": "test"}) == "custom.type.test"

def test_send_requires_started():
    t = KafkaTransport()
    with pytest.raises(RuntimeError, match="not started"):
        t.send({"type": "test"})

def test_json_roundtrip():
    event = {"aep_version": "0.1", "id": "evt_001", "type": "test", "source": "test", "created_at": "2026-07-10T10:00:00Z", "payload": {}}
    data = json.dumps(event)
    parsed = json.loads(data)
    assert parsed["id"] == "evt_001"
