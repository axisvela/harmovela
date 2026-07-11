import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.request

from aep.runtime.config import default_config


def test_emit_via_http_api_reaches_pending():
    with tempfile.TemporaryDirectory() as d:
        config_path = os.path.join(d, "aep.config.json")
        config = default_config()
        config["delivery"]["store"] = "memory"
        config["transports"]["websocket"]["enabled"] = False
        config["transports"]["sse"]["enabled"] = False
        config["transports"]["api"] = {"enabled": True, "host": "127.0.0.1", "port": 8796, "path": "/aep/api"}
        with open(config_path, "w") as f:
            json.dump(config, f)

        env = dict(os.environ)
        env["AEP_CONFIG"] = config_path
        daemon = subprocess.Popen([sys.executable, "-m", "aep.runtime.server"], env=env,
                                  stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        try:
            _wait_for_line(daemon.stdout, "aepd started")
            data = json.dumps({
                "aep_version": "0.1", "id": "evt_e2e", "type": "task.submitted",
                "source": "t", "created_at": "2026-07-11T10:00:00Z", "payload": {},
            }).encode()
            req = urllib.request.Request("http://127.0.0.1:8796/aep/api/events", data=data,
                                        headers={"Content-Type": "application/json"}, method="POST")
            with urllib.request.urlopen(req) as resp:
                assert resp.status == 202
            with urllib.request.urlopen("http://127.0.0.1:8796/aep/api/pending") as resp:
                body = json.loads(resp.read().decode())
            assert body["pending"] == 1
            assert body["records"][0]["eventId"] == "evt_e2e"
        finally:
            daemon.terminate()
            daemon.wait(timeout=5)


def _wait_for_line(stream, needle, timeout=5):
    deadline = time.time() + timeout
    while time.time() < deadline:
        line = stream.readline()
        if needle in line:
            return
    raise AssertionError(f"timed out waiting for {needle}")
