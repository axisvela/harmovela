import json
import os
import subprocess
import sys
import tempfile


def _run(args, env=None):
    full_env = dict(os.environ)
    if env:
        full_env.update(env)
    proc = subprocess.run(
        [sys.executable, "-m", "aep.cli.main", *args],
        capture_output=True, text=True, env=full_env,
    )
    return proc.returncode, proc.stdout, proc.stderr


def test_init_writes_config():
    with tempfile.TemporaryDirectory() as d:
        path = os.path.join(d, "aep.config.json")
        code, out, err = _run(["init", "--config", path])
        assert code == 0, err
        with open(path) as f:
            config = json.load(f)
        assert config["runtime"]["id"] == "aepd-local"


def test_conformance_runs():
    code, out, err = _run(["conformance"])
    assert code == 0, err
