import pytest
from aep.transport.nats import NatsTransport


def test_event_subject_topic_priority():
    t = NatsTransport(prefix="aep")
    subject = t._event_subject({"topic": "tasks.task_01", "type": "task.progress", "source": "agent:x"})
    assert subject == "aep.topic.tasks.task_01"


def test_event_subject_type():
    t = NatsTransport(prefix="aep")
    assert t._event_subject({"type": "task.progress"}) == "aep.type.task.progress"


def test_event_subject_source():
    t = NatsTransport(prefix="aep")
    assert t._event_subject({"source": "agent:researcher"}) == "aep.source.agent:researcher"


def test_event_subject_fallback():
    t = NatsTransport(prefix="aep")
    assert t._event_subject({}) == "aep.event"


def test_subscription_subjects_patterns():
    t = NatsTransport(prefix="aep")
    subjects = t.subscription_subjects(["task.*", "memory.*"], "sess_01")
    assert subjects == ["aep.type.task.>", "aep.type.memory.>", "aep.sess.sess_01"]


def test_subscription_subjects_wildcard():
    t = NatsTransport(prefix="aep")
    subjects = t.subscription_subjects(["*"], "")
    assert subjects == ["aep.>"]


def test_constructor_defaults():
    t = NatsTransport()
    assert t._url == "nats://localhost:4222"
    assert t._prefix == "aep"
    assert not t.connected


def test_send_raises_when_not_connected():
    t = NatsTransport()
    import pytest
    with pytest.raises(RuntimeError, match="not connected"):
        import asyncio
        asyncio.run(t.send({"type": "test"}))


def test_custom_prefix():
    t = NatsTransport(prefix="custom")
    assert t._event_subject({"type": "test"}) == "custom.type.test"
