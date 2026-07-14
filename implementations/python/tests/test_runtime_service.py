from harmovela_runtime.config import default_config
from harmovela_runtime.service import HarmovelaRuntimeService


def _event(**overrides):
    base = {
        "spec_version": "0.2",
        "id": "evt_1",
        "type": "task.submitted",
        "source": "test",
        "created_at": "2026-07-11T10:00:00Z",
        "payload": {},
    }
    base.update(overrides)
    return base


def _no_server_config():
    config = default_config()
    config["delivery"]["store"] = "memory"
    config["transports"]["websocket"]["enabled"] = False
    config["transports"]["sse"]["enabled"] = False
    config["transports"]["api"]["enabled"] = False
    return config


def test_publishes_to_subscribers():
    service = HarmovelaRuntimeService(_no_server_config())
    seen = []
    service.subscribe("task.*", lambda e: seen.append(e))
    service.start()
    service.publish(_event(id="evt_a"))
    assert len(seen) == 1
    assert seen[0]["id"] == "evt_a"
    service.stop()


def test_rejects_invalid_event():
    service = HarmovelaRuntimeService(_no_server_config())
    service.start()
    try:
        service.publish({"type": "task.submitted"})
        assert False, "expected ValueError"
    except ValueError as err:
        assert "invalid Harmovela event" in str(err)
    service.stop()
