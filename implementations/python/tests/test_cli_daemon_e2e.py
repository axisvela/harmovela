import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.request

from harmovela_runtime.config import default_config, write_default_config, load_config
from harmovela_runtime.server import start_daemon


def test_emit_via_http_api_reaches_pending():
    with tempfile.TemporaryDirectory() as d:
        config_path = os.path.join(d, "harmovela.config.json")
        write_default_config(config_path)
        config = load_config(config_path, env={})
        config["delivery"]["store"] = "memory"
        config["transports"]["websocket"]["enabled"] = False
        config["transports"]["sse"]["enabled"] = False
        config["transports"]["api"] = {"enabled": True, "host": "127.0.0.1", "port": 8796, "path": "/harmovela/api"}
        with open(config_path, "w") as f:
            json.dump(config, f)
        env = dict(os.environ)
        env["HARMOVELA_CONFIG"] = config_path
        service = start_daemon(config=config, config_path=config_path, install_signals=False)
        try:
            event = {
                "spec_version": "0.2", "id": "evt_e2e", "type": "task.submitted",
                "source": "test:e2e", "created_at": "2026-07-09T10:00:00Z", "payload": {},
            }
            req = urllib.request.Request("http://127.0.0.1:8796/harmovela/api/events", data=json.dumps(event).encode(),
                                        headers={"Content-Type": "application/json"}, method="POST")
            with urllib.request.urlopen(req) as resp:
                assert resp.status == 202
            with urllib.request.urlopen("http://127.0.0.1:8796/harmovela/api/pending") as resp:
                body = json.loads(resp.read().decode())
            assert body["pending"] == 1
            assert body["records"][0]["eventId"] == "evt_e2e"
        finally:
            service.stop()


def _wait_for_line(stream, needle, timeout=5):
    deadline = time.time() + timeout
    while time.time() < deadline:
        line = stream.readline()
        if needle in line:
            return
    raise AssertionError(f"timed out waiting for {needle}")
