import threading
import time

import pytest

from harmovela_client import HarmovelaClient, HarmovelaClientError
from harmovela_runtime.config import default_config
from harmovela_runtime.service import HarmovelaRuntimeService


def event(**overrides):
    value = {
        "spec_version": "0.2",
        "id": f"evt_client_{time.time_ns()}",
        "type": "task.submitted",
        "source": "client-test",
        "created_at": "2026-11-10T00:00:00.000000000Z",
        "payload": {},
    }
    value.update(overrides)
    return value


@pytest.fixture()
def client():
    config = default_config()
    config["delivery"]["store"] = "memory"
    config["transports"]["websocket"]["enabled"] = False
    config["transports"]["sse"]["enabled"] = False
    config["transports"]["api"] = {
        "enabled": True,
        "host": "127.0.0.1",
        "port": 0,
        "path": "/harmovela/api",
    }
    service = HarmovelaRuntimeService(config)
    service.start()
    port = service.transports["api"].port
    sdk = HarmovelaClient(base_url=f"http://127.0.0.1:{port}")
    try:
        yield service, sdk
    finally:
        service.stop()


def test_health_and_delivery_inspection(client):
    service, sdk = client
    health = sdk.health()
    assert health["status"] == "ok"
    assert health["runtime"]["id"] == "harmovelad-local"

    accepted = sdk.publish(event(id="evt_health"))
    assert accepted == {"accepted": True, "id": "evt_health"}
    assert sdk.stats()["pending"] == 1
    assert sdk.pending()["records"][0]["eventId"] == "evt_health"
    assert sdk.dead_lettered()["deadLettered"] == 0


def test_invalid_event_is_rejected_locally(client):
    _, sdk = client
    with pytest.raises(HarmovelaClientError) as info:
        sdk.publish({"type": "task.submitted"})
    assert info.value.status == 0
    assert "invalid Harmovela event" in str(info.value)


def test_subscription_lifecycle_and_poll(client):
    _, sdk = client
    created = sdk.create_subscription({"types": "task.*"})
    assert created["id"].startswith("sub_")
    assert len(sdk.list_subscriptions()) == 1
    assert sdk.get_subscription(created["id"])["id"] == created["id"]

    sdk.publish(event(id="evt_match", type="task.completed"))
    sdk.publish(event(id="evt_skip", type="session.opened"))
    events = sdk.poll(created["id"])
    assert [item["id"] for item in events] == ["evt_match"]

    assert sdk.delete_subscription(created["id"]) == {"deleted": True}
    with pytest.raises(HarmovelaClientError) as info:
        sdk.get_subscription(created["id"])
    assert info.value.status == 404


def test_stream_delivers_live_event(client):
    _, sdk = client
    created = sdk.create_subscription({"types": "task.*"})
    received = []

    def consume():
        for item in sdk.stream(created["id"], timeout=5):
            received.append(item)
            break

    worker = threading.Thread(target=consume, daemon=True)
    worker.start()
    time.sleep(0.1)
    sdk.publish(event(id="evt_stream", type="task.completed"))
    worker.join(timeout=3)
    assert [item["id"] for item in received] == ["evt_stream"]


def test_non_2xx_maps_to_client_error(client):
    _, sdk = client
    with pytest.raises(HarmovelaClientError) as info:
        sdk.get_subscription("missing")
    assert info.value.status == 404
