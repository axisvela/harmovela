from aep.runtime.config import default_config
from aep.runtime.service import HarmovelaRuntimeService


def _event(**overrides):
    base = {
        "spec_version": "0.2", "id": "evt_1", "type": "task.submitted",
        "source": "test", "created_at": "2026-07-11T10:00:00Z", "payload": {},
    }
    base.update(overrides)
    return base


def _config():
    config = default_config()
    config["delivery"]["store"] = "memory"
    config["transports"]["websocket"]["enabled"] = False
    config["transports"]["sse"]["enabled"] = False
    config["transports"]["api"]["enabled"] = False
    return config


def test_registry_buffers_matching_events():
    service = HarmovelaRuntimeService(_config())
    service.start()
    record = service.create_subscription({"types": "task.*"})
    service.publish(_event(id="evt_match", type="task.submitted"))
    service.publish(_event(id="evt_skip", type="session.opened"))
    drained = service.take_events(record["id"], 100)
    assert len(drained) == 1
    assert drained[0]["id"] == "evt_match"
    assert service.take_events(record["id"], 100) == []
    service.stop()


def test_registry_lists_and_deletes():
    service = HarmovelaRuntimeService(_config())
    service.start()
    record = service.create_subscription({"types": "task.*"})
    assert len(service.list_subscriptions()) == 1
    assert service.get_subscription(record["id"]) is not None
    assert service.delete_subscription(record["id"]) is True
    assert service.get_subscription(record["id"]) is None
    service.stop()
