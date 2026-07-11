import json
import urllib.error
import urllib.request
from aep.runtime.config import default_config
from aep.runtime.service import AepRuntimeService


def _api_config():
    config = default_config()
    config["delivery"]["store"] = "memory"
    config["transports"]["websocket"]["enabled"] = False
    config["transports"]["sse"]["enabled"] = False
    config["transports"]["api"] = {"enabled": True, "host": "127.0.0.1", "port": 0, "path": "/aep/api"}
    return config


def _start():
    service = AepRuntimeService(_api_config())
    service.start()
    port = service.transports["api"].port
    return service, f"http://127.0.0.1:{port}/aep/api"


def _req(method, url, body=None):
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"} if data else {}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as err:
        return err.code, json.loads(err.read().decode())


def test_subscription_crud_endpoints():
    service, base = _start()
    status, created = _req("POST", f"{base}/subscriptions", {"filter": {"types": "task.*"}})
    assert status == 201
    assert created["id"].startswith("sub_")

    status, listed = _req("GET", f"{base}/subscriptions")
    assert status == 200
    assert len(listed["subscriptions"]) == 1

    status, _ = _req("GET", f"{base}/subscriptions/{created['id']}")
    assert status == 200

    status, deleted = _req("DELETE", f"{base}/subscriptions/{created['id']}")
    assert status == 200
    assert deleted["deleted"] is True

    status, _ = _req("GET", f"{base}/subscriptions/{created['id']}")
    assert status == 404
    service.stop()


def test_long_poll_returns_matching_events():
    service, base = _start()
    status, created = _req("POST", f"{base}/subscriptions", {"filter": {"types": "task.*"}})
    service.publish({
        "aep_version": "0.1", "id": "evt_lp", "type": "task.submitted",
        "source": "t", "created_at": "2026-07-11T10:00:00Z", "payload": {},
    })
    status, body = _req("GET", f"{base}/subscriptions/{created['id']}/events")
    assert status == 200
    assert len(body["events"]) == 1
    assert body["events"][0]["id"] == "evt_lp"
    service.stop()
