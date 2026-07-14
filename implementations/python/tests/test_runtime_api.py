import json
import urllib.error
import urllib.request
from harmovela_runtime.config import default_config
from harmovela_runtime.service import HarmovelaRuntimeService


def _start():
    config = default_config()
    config["delivery"]["store"] = "memory"
    config["transports"]["websocket"]["enabled"] = False
    config["transports"]["sse"]["enabled"] = False
    config["transports"]["api"] = {"enabled": True, "host": "127.0.0.1", "port": 0, "path": "/harmovela/api"}
    service = HarmovelaRuntimeService(config)
    service.start()
    port = service.transports["api"].port
    return service, f"http://127.0.0.1:{port}/harmovela/api"


def _get(url):
    with urllib.request.urlopen(url) as resp:
        return resp.status, json.loads(resp.read().decode())


def _post(url, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as err:
        return err.code, json.loads(err.read().decode())


def test_healthz():
    service, base = _start()
    status, body = _get(f"{base}/healthz")
    assert status == 200
    assert body["status"] == "ok"
    assert body["runtime"]["id"] == "aepd-local"
    service.stop()


def test_post_events_accepts_valid():
    service, base = _start()
    seen = []
    service.subscribe("task.*", lambda e: seen.append(e))
    status, body = _post(f"{base}/events", {
        "spec_version": "0.2", "id": "evt_api", "type": "task.submitted",
        "source": "t", "created_at": "2026-07-11T10:00:00Z", "payload": {},
    })
    assert status == 202
    assert body["accepted"] is True
    assert body["id"] == "evt_api"
    assert len(seen) == 1
    service.stop()


def test_post_events_rejects_invalid():
    service, base = _start()
    status, body = _post(f"{base}/events", {"type": "task.submitted"})
    assert status == 400
    assert body["accepted"] is False
    assert isinstance(body["errors"], list)
    service.stop()


def test_stats_pending_dlq():
    service, base = _start()
    service.publish({
        "spec_version": "0.2", "id": "evt_p", "type": "task.submitted",
        "source": "t", "created_at": "2026-07-11T10:00:00Z", "payload": {},
    })
    status, stats = _get(f"{base}/stats")
    assert stats["pending"] == 1
    status, pending = _get(f"{base}/pending")
    assert pending["pending"] == 1
    service.store.dead_letter("evt_p", {"error": {"code": "timeout"}})
    status, dlq = _get(f"{base}/dlq")
    assert dlq["deadLettered"] == 1
    service.stop()
