import json
import os
import subprocess
import sys

from aep.runtime.config import default_config
from aep.runtime.service import AepRuntimeService


def _run(args):
    proc = subprocess.run(
        [sys.executable, "-m", "aep.cli.main", *args],
        capture_output=True, text=True, env=dict(os.environ),
    )
    return proc.returncode, proc.stdout, proc.stderr


def _api_config(port):
    config = default_config()
    config["delivery"]["store"] = "memory"
    config["transports"]["websocket"]["enabled"] = False
    config["transports"]["sse"]["enabled"] = False
    config["transports"]["api"] = {"enabled": True, "host": "127.0.0.1", "port": port, "path": "/aep/api"}
    return config


def test_subscriptions_crud():
    service = AepRuntimeService(_api_config(18911))
    service.start()
    base = "http://127.0.0.1:18911/aep/api"
    try:
        code, out, err = _run(["subscriptions", "create", "--filter", '{"types":"task.*"}', "--base", base])
        assert code == 0, err
        record = json.loads(out)
        assert record["id"].startswith("sub_")

        code, out, err = _run(["subscriptions", "list", "--base", base])
        assert code == 0, err
        assert record["id"] in out

        code, out, err = _run(["subscriptions", "delete", record["id"], "--base", base])
        assert code == 0, err
        assert "true" in out.lower()

        code, out, err = _run(["subscriptions", "delete", record["id"], "--base", base])
        assert code != 0
    finally:
        service.stop()


def test_subscriptions_create_rejects_invalid_filter():
    code, out, err = _run(["subscriptions", "create", "--filter", "{"])
    assert code != 0
    assert "invalid JSON filter" in err
