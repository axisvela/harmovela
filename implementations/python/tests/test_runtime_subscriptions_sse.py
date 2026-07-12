import json
import threading
import time
import urllib.request
from aep.runtime.config import default_config
from aep.runtime.service import HarmovelaRuntimeService


def _api_config():
    config = default_config()
    config["delivery"]["store"] = "memory"
    config["transports"]["websocket"]["enabled"] = False
    config["transports"]["sse"]["enabled"] = False
    config["transports"]["api"] = {"enabled": True, "host": "127.0.0.1", "port": 0, "path": "/harmovela/api"}
    service.start()
    port = service.transports["api"].port
    base = f"http://127.0.0.1:{port}/harmovela/api"

    data = json.dumps({"filter": {"types": "task.*"}}).encode()
    req = urllib.request.Request(f"{base}/subscriptions", data=data,
                                headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req) as resp:
        created = json.loads(resp.read().decode())

    received = []

    def read_stream():
        with urllib.request.urlopen(f"{base}/subscriptions/{created['id']}/stream", timeout=5) as resp:
            for raw in resp:
                line = raw.decode()
                if line.startswith("data: "):
                    received.append(json.loads(line[len("data: "):]))
                    return

    t = threading.Thread(target=read_stream, daemon=True)
    t.start()
    time.sleep(0.3)
    service.publish({
        "spec_version": "0.2", "id": "evt_sse", "type": "task.submitted",
        "source": "t", "created_at": "2026-07-11T10:00:00Z", "payload": {},
    })
    t.join(timeout=3)
    assert any(e["id"] == "evt_sse" for e in received)
    service.stop()
