# Python CLI Subscriptions Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `aep subscriptions` click command group (create/list/delete/stream) to the Python CLI that calls the runtime HTTP subscriptions API.

**Architecture:** A new click group `subscriptions` in `aep/cli/main.py` with `create`, `list`, `delete`, `stream` subcommands, each accepting `--base`. Uses `urllib.request` for create/list/delete and streams SSE lines for stream.

**Tech Stack:** Python 3.12+, click, stdlib `urllib.request`, `pytest`.

**Design reference:** `docs/superpowers/specs/2026-07-11-multi-language-cli-subscriptions-design.md`

---

## File Structure

- Modify `reference/python/src/aep/cli/main.py`: add the `subscriptions` group.
- Create `reference/python/tests/test_cli_subscriptions.py`.

---

## Task 1: subscriptions create/list/delete

**Files:**
- Modify: `reference/python/src/aep/cli/main.py`
- Test: `reference/python/tests/test_cli_subscriptions.py`

- [ ] **Step 1: Write failing tests**

Create `reference/python/tests/test_cli_subscriptions.py`:

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd reference/python && python -m pytest tests/test_cli_subscriptions.py -q`
Expected: FAIL because the `subscriptions` group does not exist (click reports no such command).

- [ ] **Step 3: Implement the subscriptions group**

In `reference/python/src/aep/cli/main.py`, add near the other imports (top of file):

```python
import urllib.error
```

`urllib.request` and `json`/`sys` are already imported. Add the group after the existing commands (before `if __name__ == "__main__":`):

```python
@cli.group()
def subscriptions():
    """Manage runtime subscriptions over HTTP."""


@subscriptions.command("create")
@click.option("--filter", "filter_text", default="{}", help="subscription filter JSON")
@click.option("--base", default="http://127.0.0.1:8790/aep/api", help="runtime API base URL")
def subscriptions_create(filter_text, base):
    try:
        filter_ = json.loads(filter_text)
    except json.JSONDecodeError:
        click.echo("invalid JSON filter", err=True)
        sys.exit(1)
    data = json.dumps({"filter": filter_}).encode()
    req = urllib.request.Request(f"{base}/subscriptions", data=data,
                                headers={"Content-Type": "application/json"}, method="POST")
    _print_response(req)


@subscriptions.command("list")
@click.option("--base", default="http://127.0.0.1:8790/aep/api", help="runtime API base URL")
def subscriptions_list(base):
    req = urllib.request.Request(f"{base}/subscriptions", method="GET")
    _print_response(req)


@subscriptions.command("delete")
@click.argument("subscription_id")
@click.option("--base", default="http://127.0.0.1:8790/aep/api", help="runtime API base URL")
def subscriptions_delete(subscription_id, base):
    req = urllib.request.Request(f"{base}/subscriptions/{subscription_id}", method="DELETE")
    try:
        with urllib.request.urlopen(req) as resp:
            click.echo(resp.read().decode())
    except urllib.error.HTTPError as err:
        if err.code == 404:
            click.echo("not found", err=True)
        else:
            click.echo(f"request failed: HTTP {err.code}", err=True)
        sys.exit(1)
    except Exception as err:
        click.echo(f"request failed: {err}. Is aepd running?", err=True)
        sys.exit(1)


@subscriptions.command("stream")
@click.argument("subscription_id")
@click.option("--base", default="http://127.0.0.1:8790/aep/api", help="runtime API base URL")
def subscriptions_stream(subscription_id, base):
    try:
        resp = urllib.request.urlopen(f"{base}/subscriptions/{subscription_id}/stream")
    except urllib.error.HTTPError as err:
        if err.code == 404:
            click.echo("not found", err=True)
        else:
            click.echo(f"request failed: HTTP {err.code}", err=True)
        sys.exit(1)
    except Exception as err:
        click.echo(f"request failed: {err}. Is aepd running?", err=True)
        sys.exit(1)
    try:
        for raw in resp:
            line = raw.decode()
            if line.startswith("data: "):
                click.echo(line[len("data: "):].rstrip("\n"))
    except KeyboardInterrupt:
        pass


def _print_response(req):
    try:
        with urllib.request.urlopen(req) as resp:
            click.echo(resp.read().decode())
    except urllib.error.HTTPError as err:
        click.echo(f"request failed: HTTP {err.code}", err=True)
        sys.exit(1)
    except Exception as err:
        click.echo(f"request failed: {err}. Is aepd running?", err=True)
        sys.exit(1)
```

Confirm `import sys`, `import json`, and `import urllib.request` are present at the top of `main.py`; add any that are missing.

- [ ] **Step 4: Run tests**

Run: `cd reference/python && python -m pytest tests/test_cli_subscriptions.py -q`
Expected: PASS.

- [ ] **Step 5: Commit and push**

```bash
git add reference/python/src/aep/cli/main.py reference/python/tests/test_cli_subscriptions.py
git commit -m "feat(python): add aep subscriptions create/list/delete CLI commands"
git push origin master
```

---

## Task 2: subscriptions stream e2e

**Files:**
- Test: `reference/python/tests/test_cli_subscriptions.py`

The `stream` subcommand is implemented in Task 1. This task adds an end-to-end stream test.

- [ ] **Step 1: Write the stream test**

Append to `reference/python/tests/test_cli_subscriptions.py`:

```python
import threading
import time


def test_subscriptions_stream_receives_event():
    service = AepRuntimeService(_api_config(18912))
    service.start()
    base = "http://127.0.0.1:18912/aep/api"
    try:
        code, out, err = _run(["subscriptions", "create", "--filter", '{"types":"task.*"}', "--base", base])
        record = json.loads(out)

        proc = subprocess.Popen(
            [sys.executable, "-m", "aep.cli.main", "subscriptions", "stream", record["id"], "--base", base],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=dict(os.environ),
        )
        collected = []

        def reader():
            for line in proc.stdout:
                collected.append(line)
                if "evt_stream" in line:
                    return

        t = threading.Thread(target=reader, daemon=True)
        t.start()
        time.sleep(0.4)
        service.publish({
            "aep_version": "0.1", "id": "evt_stream", "type": "task.submitted",
            "source": "t", "created_at": "2026-07-11T10:00:00Z", "payload": {},
        })
        t.join(timeout=3)
        proc.terminate()
        proc.wait(timeout=5)
        assert any("evt_stream" in line for line in collected)
    finally:
        service.stop()
```

- [ ] **Step 2: Run the stream test**

Run: `cd reference/python && python -m pytest tests/test_cli_subscriptions.py -q`
Expected: PASS. The runtime SSE endpoint flushes an initial comment so the stream is established before publish.

- [ ] **Step 3: Commit and push**

```bash
git add reference/python/tests/test_cli_subscriptions.py
git commit -m "test(python): cover aep subscriptions stream end-to-end"
git push origin master
```

---

## Task 3: Final verification

- [ ] **Step 1: Run full Python suite**

Run: `cd reference/python && python -m pytest`
Expected: all tests pass.

- [ ] **Step 2: Verify git sync**

Run: `git status -sb`
Expected: `## master...origin/master` with no changed files.
