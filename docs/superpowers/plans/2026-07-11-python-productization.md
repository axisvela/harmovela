# Python Productization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Python reference a config loader, runtime service, `aepd` daemon, `aep` CLI, and an HTTP read+ingest API, matching TypeScript core parity.

**Architecture:** New `aep.runtime` package composes existing envelope validation, router, delivery stores, and the WebSocket server transport. A stdlib `http.server` api server exposes health, ingest, dlq, pending, stats. A `click` CLI and an `aepd` daemon entrypoint wrap the runtime. Delivery stores gain `get_dead_lettered` to back the dlq endpoint.

**Tech Stack:** Python 3.12+, `click`, stdlib `http.server`, existing `websockets`, `pytest`.

**Design reference:** `docs/superpowers/specs/2026-07-11-multi-language-productization-design.md`

---

## File Structure

- Modify `implementations/python/src/aep/delivery_store.py`, `sqlite_delivery_store.py`, `postgres_delivery_store.py`: add `get_dead_lettered`.
- Create `implementations/python/src/aep/runtime/__init__.py`.
- Create `implementations/python/src/aep/runtime/config.py`.
- Create `implementations/python/src/aep/runtime/service.py`.
- Create `implementations/python/src/aep/runtime/api_server.py`.
- Create `implementations/python/src/aep/runtime/server.py` (daemon).
- Create `implementations/python/src/aep/cli/__init__.py`.
- Create `implementations/python/src/aep/cli/main.py` (click group).
- Modify `implementations/python/pyproject.toml`: add `click`, add `[project.scripts]`.
- Create tests under `implementations/python/tests/`.

---

## Task 1: Delivery stores get_dead_lettered

**Files:**
- Modify: `implementations/python/src/aep/delivery_store.py`
- Modify: `implementations/python/src/aep/sqlite_delivery_store.py`
- Modify: `implementations/python/src/aep/postgres_delivery_store.py`
- Test: `implementations/python/tests/test_delivery_store.py`, `tests/test_sqlite_delivery_store.py`, `tests/test_postgres_delivery_store.py`

- [ ] **Step 1: Write failing tests**

Append to `implementations/python/tests/test_delivery_store.py`:

```python
def test_lists_dead_lettered_records():
    store = InMemoryDeliveryStore()
    store.track("evt_1", "sub_01")
    store.dead_letter("evt_1", {"error": {"code": "timeout"}})
    records = store.get_dead_lettered()
    assert len(records) == 1
    assert records[0]["eventId"] == "evt_1"
    assert records[0]["reason"]["error"]["code"] == "timeout"
```

Append to `implementations/python/tests/test_sqlite_delivery_store.py`:

```python
def test_lists_dead_lettered_records():
    store = SqliteDeliveryStore(":memory:")
    store.track("evt_1", "sub_01")
    store.dead_letter("evt_1", {"error": {"code": "timeout"}})
    records = store.get_dead_lettered()
    assert len(records) == 1
    assert records[0]["eventId"] == "evt_1"
    assert records[0]["reason"]["error"]["code"] == "timeout"
    store.close()
```

Append to `implementations/python/tests/test_postgres_delivery_store.py`:

```python
def test_lists_dead_lettered_records(store):
    store.track("evt_1", "sub_01")
    store.dead_letter("evt_1", {"error": {"code": "timeout"}})
    records = store.get_dead_lettered()
    assert len(records) == 1
    assert records[0]["eventId"] == "evt_1"
    assert records[0]["reason"]["error"]["code"] == "timeout"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd implementations/python && python -m pytest tests/test_delivery_store.py tests/test_sqlite_delivery_store.py -q`
Expected: FAIL with `AttributeError: 'InMemoryDeliveryStore' object has no attribute 'get_dead_lettered'`.

- [ ] **Step 3: Implement in-memory get_dead_lettered**

In `implementations/python/src/aep/delivery_store.py`, the `_dead_lettered` dict stores records keyed by event id. Inspect its stored record shape and add a method to the class (after `get_pending_for_subscription`):

```python
    def get_dead_lettered(self) -> list[dict]:
        return [
            {
                "eventId": event_id,
                "subscriptionId": rec.get("subscriptionId"),
                "reason": rec.get("reason", {}),
            }
            for event_id, rec in self._dead_lettered.items()
        ]
```

If the stored record does not already carry `subscriptionId` and `reason`, update `dead_letter` to store them. Read the existing `dead_letter` method first and align keys so the returned record includes `eventId`, `subscriptionId`, and `reason`.

- [ ] **Step 4: Implement sqlite get_dead_lettered**

In `implementations/python/src/aep/sqlite_delivery_store.py`, add after `get_pending_for_subscription`:

```python
    def get_dead_lettered(self) -> list[dict]:
        rows = self._db.execute(
            "SELECT event_id, subscription_id, reason FROM delivery_dead_lettered ORDER BY seq"
        ).fetchall()
        return [
            {
                "eventId": r["event_id"],
                "subscriptionId": r["subscription_id"],
                "reason": json.loads(r["reason"]),
            }
            for r in rows
        ]
```

Ensure `import json` exists at the top of the file; add it if missing.

- [ ] **Step 5: Implement postgres get_dead_lettered**

In `implementations/python/src/aep/postgres_delivery_store.py`, add after `get_pending_for_subscription`:

```python
    def get_dead_lettered(self) -> list[dict]:
        with self._conn.cursor() as cur:
            cur.execute(
                f"SELECT event_id, subscription_id, reason FROM {self._t('dead_lettered')} ORDER BY seq"
            )
            rows = cur.fetchall()
        return [
            {
                "eventId": r[0],
                "subscriptionId": r[1],
                "reason": r[2] if isinstance(r[2], dict) else json.loads(r[2]),
            }
            for r in rows
        ]
```

Ensure `import json` exists at the top; add it if missing.

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd implementations/python && python -m pytest tests/test_delivery_store.py tests/test_sqlite_delivery_store.py tests/test_postgres_delivery_store.py -q`
Expected: PASS.

- [ ] **Step 7: Commit and push**

```bash
git add implementations/python/src/aep/delivery_store.py implementations/python/src/aep/sqlite_delivery_store.py implementations/python/src/aep/postgres_delivery_store.py implementations/python/tests/test_delivery_store.py implementations/python/tests/test_sqlite_delivery_store.py implementations/python/tests/test_postgres_delivery_store.py
git commit -m "feat(python): add get_dead_lettered to delivery stores"
git push origin master
```

---

## Task 2: Runtime config

**Files:**
- Create: `implementations/python/src/aep/runtime/__init__.py`
- Create: `implementations/python/src/aep/runtime/config.py`
- Test: `implementations/python/tests/test_runtime_config.py`

- [ ] **Step 1: Write failing config tests**

Create `implementations/python/tests/test_runtime_config.py`:

```python
import json
import os
import tempfile
from aep.runtime.config import default_config, write_default_config, load_config, apply_env_overrides, create_delivery_store
from aep.delivery_store import InMemoryDeliveryStore
from aep.sqlite_delivery_store import SqliteDeliveryStore


def test_default_config():
    config = default_config()
    assert config["aep_version"] == "0.1"
    assert config["runtime"]["id"] == "aepd-local"
    assert config["delivery"]["store"] == "sqlite"
    assert config["transports"]["websocket"]["port"] == 8787
    assert config["transports"]["api"]["port"] == 8790


def test_write_and_load_config():
    with tempfile.TemporaryDirectory() as d:
        path = os.path.join(d, "aep.config.json")
        write_default_config(path)
        config = load_config(path, env={})
        assert config["runtime"]["source"] == "runtime:aepd"


def test_apply_env_overrides():
    config = apply_env_overrides(default_config(), {
        "AEPD_HOST": "0.0.0.0",
        "AEPD_WS_PORT": "9001",
        "AEPD_API_PORT": "9003",
        "AEP_POSTGRES_URL": "postgres://example/db",
    })
    assert config["transports"]["websocket"]["host"] == "0.0.0.0"
    assert config["transports"]["websocket"]["port"] == 9001
    assert config["transports"]["api"]["port"] == 9003
    assert config["delivery"]["postgres"]["url"] == "postgres://example/db"


def test_create_delivery_store():
    mem = create_delivery_store({"delivery": {"store": "memory"}})
    assert isinstance(mem, InMemoryDeliveryStore)
    sqlite = create_delivery_store({"delivery": {"store": "sqlite", "sqlite": {"path": ":memory:"}}})
    assert isinstance(sqlite, SqliteDeliveryStore)
    sqlite.close()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd implementations/python && python -m pytest tests/test_runtime_config.py -q`
Expected: FAIL with `ModuleNotFoundError: No module named 'aep.runtime'`.

- [ ] **Step 3: Create runtime package init**

Create `implementations/python/src/aep/runtime/__init__.py`:

```python
```

(empty file)

- [ ] **Step 4: Implement config module**

Create `implementations/python/src/aep/runtime/config.py`:

```python
import copy
import json
import os

from ..delivery_store import InMemoryDeliveryStore
from ..sqlite_delivery_store import SqliteDeliveryStore
from ..postgres_delivery_store import PostgresDeliveryStore


def default_config() -> dict:
    return {
        "aep_version": "0.1",
        "runtime": {"id": "aepd-local", "source": "runtime:aepd"},
        "transports": {
            "websocket": {"enabled": True, "host": "127.0.0.1", "port": 8787, "path": "/aep"},
            "sse": {"enabled": True, "host": "127.0.0.1", "port": 8788, "path": "/aep/events"},
            "api": {"enabled": True, "host": "127.0.0.1", "port": 8790, "path": "/aep/api"},
            "stdio": {"enabled": False},
        },
        "delivery": {
            "store": "sqlite",
            "sqlite": {"path": ".aep/aep.sqlite"},
            "postgres": {"url": "postgres://postgres:postgres@localhost:5433/postgres"},
        },
    }


def write_default_config(path: str = "aep.config.json") -> str:
    parent = os.path.dirname(os.path.abspath(path))
    os.makedirs(parent, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(json.dumps(default_config(), indent=2) + "\n")
    return path


def load_config(path: str | None = None, env: dict | None = None) -> dict:
    if env is None:
        env = os.environ
    if path is None:
        path = env.get("AEP_CONFIG", "aep.config.json")
    with open(path, "r", encoding="utf-8") as f:
        parsed = json.load(f)
    return apply_env_overrides(parsed, env)


def apply_env_overrides(config: dict, env: dict | None = None) -> dict:
    if env is None:
        env = os.environ
    nxt = copy.deepcopy(config)
    if env.get("AEPD_HOST"):
        nxt["transports"]["websocket"]["host"] = env["AEPD_HOST"]
        nxt["transports"]["sse"]["host"] = env["AEPD_HOST"]
        nxt["transports"]["api"]["host"] = env["AEPD_HOST"]
    if env.get("AEPD_WS_PORT"):
        nxt["transports"]["websocket"]["port"] = int(env["AEPD_WS_PORT"])
    if env.get("AEPD_SSE_PORT"):
        nxt["transports"]["sse"]["port"] = int(env["AEPD_SSE_PORT"])
    if env.get("AEPD_API_PORT"):
        nxt["transports"]["api"]["port"] = int(env["AEPD_API_PORT"])
    if env.get("AEP_POSTGRES_URL"):
        nxt["delivery"]["postgres"]["url"] = env["AEP_POSTGRES_URL"]
    return nxt


def create_delivery_store(config: dict):
    delivery = config.get("delivery", {"store": "memory"})
    store = delivery.get("store", "memory")
    if store == "memory":
        return InMemoryDeliveryStore()
    if store == "sqlite":
        return SqliteDeliveryStore(delivery.get("sqlite", {}).get("path", ":memory:"))
    if store == "postgres":
        return PostgresDeliveryStore(
            delivery.get("postgres", {}).get("url") or os.environ.get("AEP_POSTGRES_URL"),
            stream_id=delivery.get("stream_id", "stream_01"),
        )
    raise ValueError(f"unsupported delivery store: {store}")
```

- [ ] **Step 5: Run config tests**

Run: `cd implementations/python && python -m pytest tests/test_runtime_config.py -q`
Expected: PASS.

- [ ] **Step 6: Commit and push**

```bash
git add implementations/python/src/aep/runtime/__init__.py implementations/python/src/aep/runtime/config.py implementations/python/tests/test_runtime_config.py
git commit -m "feat(python): add runtime config loader"
git push origin master
```

---

## Task 3: Runtime service

**Files:**
- Create: `implementations/python/src/aep/runtime/service.py`
- Test: `implementations/python/tests/test_runtime_service.py`

- [ ] **Step 1: Write failing service tests**

Create `implementations/python/tests/test_runtime_service.py`:

```python
from aep.runtime.config import default_config
from aep.runtime.service import AepRuntimeService


def _event(**overrides):
    base = {
        "aep_version": "0.1",
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
    service = AepRuntimeService(_no_server_config())
    seen = []
    service.subscribe("task.*", lambda e: seen.append(e))
    service.start()
    service.publish(_event(id="evt_a"))
    assert len(seen) == 1
    assert seen[0]["id"] == "evt_a"
    service.stop()


def test_rejects_invalid_event():
    service = AepRuntimeService(_no_server_config())
    service.start()
    try:
        service.publish({"type": "task.submitted"})
        assert False, "expected ValueError"
    except ValueError as err:
        assert "invalid AEP event" in str(err)
    service.stop()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd implementations/python && python -m pytest tests/test_runtime_service.py -q`
Expected: FAIL with `ModuleNotFoundError: No module named 'aep.runtime.service'`.

- [ ] **Step 3: Implement runtime service**

Create `implementations/python/src/aep/runtime/service.py`:

```python
from ..router import EventRouter
from ..envelope import validate_envelope
from ..subscription import subscription_matches
from ..transport.websocket import WsServerTransport
from .config import create_delivery_store
from .api_server import start_api_server


class AepRuntimeService:
    def __init__(self, config: dict, router=None, store=None):
        self.config = config
        self.router = router or EventRouter()
        self.store = store or create_delivery_store(config)
        self.transports = {}
        self.subscriptions = {}
        self.max_buffer = 1000
        self.started = False

    def subscribe(self, pattern, handler):
        self.router.on(pattern, handler)
        return self

    def publish(self, event: dict) -> dict:
        errors = validate_envelope(event)
        if errors:
            raise ValueError(f"invalid AEP event: {'; '.join(errors)}")
        if hasattr(self.store, "track"):
            self.store.track(event["id"], event.get("subscription_id", "_runtime"))
        self.router.dispatch(event)
        for transport in list(self.transports.values()):
            send = getattr(transport, "send", None)
            if callable(send):
                send(event)
        return event

    def start(self):
        if self.started:
            return
        ws = self.config.get("transports", {}).get("websocket", {})
        if ws.get("enabled"):
            transport = WsServerTransport(port=ws.get("port", 0), host=ws.get("host", "127.0.0.1"), path=ws.get("path", "/aep"))
            transport.on_message(lambda event: self.publish(event))
            transport.start()
            self.transports["websocket"] = transport
        api = self.config.get("transports", {}).get("api", {})
        if api.get("enabled"):
            self.transports["api"] = start_api_server(self, api)
        self.started = True

    def stop(self):
        for transport in reversed(list(self.transports.values())):
            stop = getattr(transport, "stop", None)
            if callable(stop):
                stop()
        self.transports = {}
        close = getattr(self.store, "close", None)
        if callable(close):
            close()
        self.started = False

    def get_stats(self) -> dict:
        get = getattr(self.store, "get_stats", None)
        return get() if callable(get) else {}

    def get_pending(self) -> list:
        get = getattr(self.store, "get_pending", None)
        return get() if callable(get) else []

    def get_dead_lettered(self) -> list:
        get = getattr(self.store, "get_dead_lettered", None)
        return get() if callable(get) else []
```

Note: `api_server.start_api_server` is created in Task 4. This import will fail until Task 4 is done, so runtime service tests that disable the api transport still import the module. To keep Task 3 self-contained, create a minimal `api_server.py` stub now:

Create `implementations/python/src/aep/runtime/api_server.py`:

```python
def start_api_server(service, options):
    raise NotImplementedError("api server implemented in Task 4")
```

The service tests disable the api transport, so the stub is never called.

Also confirm the WebSocket transport exposes `on_message`. If the base `Transport` uses a different registration method, read `implementations/python/src/aep/transport/base.py` and use the correct method name; adjust the `transport.on_message(...)` call accordingly.

- [ ] **Step 4: Run service tests**

Run: `cd implementations/python && python -m pytest tests/test_runtime_service.py -q`
Expected: PASS.

- [ ] **Step 5: Commit and push**

```bash
git add implementations/python/src/aep/runtime/service.py implementations/python/src/aep/runtime/api_server.py implementations/python/tests/test_runtime_service.py
git commit -m "feat(python): add runtime service"
git push origin master
```

---

## Task 4: HTTP API server

**Files:**
- Modify: `implementations/python/src/aep/runtime/api_server.py`
- Test: `implementations/python/tests/test_runtime_api.py`

- [ ] **Step 1: Write failing api tests**

Create `implementations/python/tests/test_runtime_api.py`:

```python
import json
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
        "aep_version": "0.1", "id": "evt_api", "type": "task.submitted",
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
        "aep_version": "0.1", "id": "evt_p", "type": "task.submitted",
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd implementations/python && python -m pytest tests/test_runtime_api.py -q`
Expected: FAIL with `NotImplementedError` from the stub.

- [ ] **Step 3: Implement api server**

Replace `implementations/python/src/aep/runtime/api_server.py` with:

```python
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from ..envelope import validate_envelope


def start_api_server(service, options):
    base = options.get("path", "/aep/api")

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def _route(self):
            path = self.path.split("?", 1)[0]
            return path[len(base):] if path.startswith(base) else None

        def _send(self, status, body):
            payload = json.dumps(body).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

        def do_GET(self):
            route = self._route()
            if route == "/healthz":
                return self._send(200, {"status": "ok", "runtime": service.config["runtime"], "delivery": service.get_stats()})
            if route == "/dlq":
                records = service.get_dead_lettered()
                return self._send(200, {"deadLettered": len(records), "records": records})
            if route == "/pending":
                records = service.get_pending()
                return self._send(200, {"pending": len(records), "records": records})
            if route == "/stats":
                return self._send(200, service.get_stats())
            return self._send(404, {"error": "not found"})

        def do_POST(self):
            route = self._route()
            if route != "/events":
                return self._send(404, {"error": "not found"})
            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length).decode() if length else ""
            try:
                event = json.loads(raw)
            except json.JSONDecodeError:
                return self._send(400, {"accepted": False, "errors": ["invalid JSON body"]})
            errors = validate_envelope(event)
            if errors:
                return self._send(400, {"accepted": False, "errors": errors})
            service.publish(event)
            return self._send(202, {"accepted": True, "id": event.get("id")})

    server = ThreadingHTTPServer((options.get("host", "127.0.0.1"), options.get("port", 0)), Handler)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    class ApiHandle:
        def __init__(self):
            self.port = port

        def stop(self):
            server.shutdown()
            server.server_close()

    return ApiHandle()
```

Note: `service.publish` is called inside `do_POST` after validation. Because the api server calls `publish`, and `publish` re-validates, that double validation is acceptable; the 400 path returns validation errors before calling publish.

- [ ] **Step 4: Run api tests**

Run: `cd implementations/python && python -m pytest tests/test_runtime_api.py -q`
Expected: PASS.

- [ ] **Step 5: Commit and push**

```bash
git add implementations/python/src/aep/runtime/api_server.py implementations/python/tests/test_runtime_api.py
git commit -m "feat(python): add runtime HTTP api server"
git push origin master
```

---

## Task 5: Daemon entrypoint

**Files:**
- Create: `implementations/python/src/aep/runtime/server.py`
- Test: `implementations/python/tests/test_runtime_daemon.py`

- [ ] **Step 1: Write failing daemon test**

Create `implementations/python/tests/test_runtime_daemon.py`:

```python
from aep.runtime.config import default_config
from aep.runtime.server import start_daemon


def test_start_daemon_returns_service():
    config = default_config()
    config["delivery"]["store"] = "memory"
    config["transports"]["websocket"]["enabled"] = False
    config["transports"]["sse"]["enabled"] = False
    config["transports"]["api"] = {"enabled": True, "host": "127.0.0.1", "port": 0, "path": "/aep/api"}
    service = start_daemon(config=config, install_signals=False)
    assert service.started is True
    assert "api" in service.transports
    service.stop()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd implementations/python && python -m pytest tests/test_runtime_daemon.py -q`
Expected: FAIL with `ModuleNotFoundError: No module named 'aep.runtime.server'`.

- [ ] **Step 3: Implement daemon**

Create `implementations/python/src/aep/runtime/server.py`:

```python
import signal

from .config import load_config
from .service import AepRuntimeService


def start_daemon(config=None, config_path=None, install_signals=True) -> AepRuntimeService:
    if config is None:
        config = load_config(config_path)
    service = AepRuntimeService(config)
    service.start()
    ws = service.transports.get("websocket")
    api = service.transports.get("api")
    ws_port = ws.port if ws else "disabled"
    api_port = api.port if api else "disabled"
    print(f"aepd started ws={ws_port} api={api_port}", flush=True)

    if install_signals:
        def handle(_signum, _frame):
            service.stop()
            raise SystemExit(0)
        signal.signal(signal.SIGINT, handle)
        signal.signal(signal.SIGTERM, handle)

    return service


def main():
    import os
    service = start_daemon(config_path=os.environ.get("AEP_CONFIG"))
    try:
        signal.pause()
    except (AttributeError, KeyboardInterrupt):
        try:
            while True:
                import time
                time.sleep(3600)
        except KeyboardInterrupt:
            service.stop()


if __name__ == "__main__":
    main()
```

Note: `signal.pause` is not available on Windows. The fallback loop keeps the process alive; Ctrl+C stops it. On tests we always pass `install_signals=False`.

- [ ] **Step 4: Run daemon test**

Run: `cd implementations/python && python -m pytest tests/test_runtime_daemon.py -q`
Expected: PASS.

- [ ] **Step 5: Commit and push**

```bash
git add implementations/python/src/aep/runtime/server.py implementations/python/tests/test_runtime_daemon.py
git commit -m "feat(python): add aepd daemon entrypoint"
git push origin master
```

---

## Task 6: CLI

**Files:**
- Modify: `implementations/python/pyproject.toml`
- Create: `implementations/python/src/aep/cli/__init__.py`
- Create: `implementations/python/src/aep/cli/main.py`
- Test: `implementations/python/tests/test_cli.py`

- [ ] **Step 1: Add click dependency and scripts**

In `implementations/python/pyproject.toml`, add `"click>=8"` to `dependencies`, and add a scripts section after `[project]` dependencies:

```toml
[project.scripts]
aep = "aep.cli.main:cli"
aepd = "aep.runtime.server:main"
```

- [ ] **Step 2: Install click**

Run: `cd implementations/python && pip install "click>=8"`
Expected: click installs.

- [ ] **Step 3: Write failing CLI tests**

Create `implementations/python/tests/test_cli.py`:

```python
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
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd implementations/python && python -m pytest tests/test_cli.py -q`
Expected: FAIL because `aep.cli.main` does not exist.

- [ ] **Step 5: Create cli package init**

Create `implementations/python/src/aep/cli/__init__.py`:

```python
```

(empty file)

- [ ] **Step 6: Implement the CLI**

Create `implementations/python/src/aep/cli/main.py`:

```python
import asyncio
import json
import subprocess
import sys
import urllib.request

import click

from ..runtime.config import write_default_config, load_config, create_delivery_store
from ..runtime.server import start_daemon


@click.group()
def cli():
    """Agent Event Protocol CLI."""


@cli.command()
@click.option("--config", "config_path", default="aep.config.json", help="config file path")
def init(config_path):
    """Create an AEP runtime config file."""
    write_default_config(config_path)
    click.echo(f"created {config_path}")


@cli.command()
@click.option("--config", "config_path", default=None, help="config file path")
def start(config_path):
    """Start the local aepd runtime daemon."""
    service = start_daemon(config_path=config_path)
    try:
        import time
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        service.stop()


@cli.command()
@click.option("--url", default="http://127.0.0.1:8790/aep/api/healthz", help="health endpoint URL")
def status(url):
    """Query an aepd health endpoint."""
    try:
        with urllib.request.urlopen(url) as resp:
            click.echo(resp.read().decode())
    except Exception as err:
        click.echo(f"status request failed: {err}", err=True)
        sys.exit(1)


@cli.command()
@click.argument("event_type")
@click.option("--payload", default="{}", help="event payload JSON")
@click.option("--url", default="ws://127.0.0.1:8787/aep", help="WebSocket URL")
@click.option("--id", "event_id", default=None, help="event id")
@click.option("--source", default="cli:aep", help="event source")
def emit(event_type, payload, url, event_id, source):
    """Emit one AEP event over WebSocket."""
    import uuid
    from datetime import datetime, timezone
    try:
        parsed = json.loads(payload)
    except json.JSONDecodeError:
        click.echo("invalid JSON payload", err=True)
        sys.exit(1)
    event = {
        "aep_version": "0.1",
        "id": event_id or f"evt_{uuid.uuid4().hex}",
        "type": event_type,
        "source": source,
        "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "payload": parsed,
    }
    asyncio.run(_emit_ws(url, event))
    click.echo(json.dumps(event))


async def _emit_ws(url, event):
    import websockets
    async with websockets.connect(url, subprotocols=["aep-0.1"]) as ws:
        await ws.send(json.dumps(event))


@cli.command()
@click.option("--type", "pattern", default="*", help="event type pattern")
@click.option("--url", default="ws://127.0.0.1:8787/aep", help="WebSocket URL")
def subscribe(pattern, url):
    """Subscribe to AEP events over WebSocket."""
    from ..subscription import matches_type
    asyncio.run(_subscribe_ws(url, pattern, matches_type))


async def _subscribe_ws(url, pattern, matches_type):
    import websockets
    async with websockets.connect(url, subprotocols=["aep-0.1"]) as ws:
        async for message in ws:
            event = json.loads(message)
            if matches_type(pattern, event.get("type")):
                click.echo(json.dumps(event))


@cli.command()
@click.argument("subcommand", default="list")
@click.option("--config", "config_path", default="aep.config.json", help="config file path")
def dlq(subcommand, config_path):
    """Inspect dead-lettered events."""
    if subcommand != "list":
        click.echo(f"unsupported dlq command: {subcommand}", err=True)
        sys.exit(1)
    config = load_config(config_path)
    store = create_delivery_store(config)
    stats = store.get_stats() if hasattr(store, "get_stats") else {}
    records = store.get_dead_lettered() if hasattr(store, "get_dead_lettered") else []
    click.echo(json.dumps({"deadLettered": stats.get("deadLettered", len(records)), "records": records}))
    if hasattr(store, "close"):
        store.close()


@cli.command()
@click.option("--level", default=None, help="target conformance level")
def conformance(level):
    """Run the conformance test suite."""
    args = [sys.executable, "-m", "pytest", "tests/test_conformance.py", "-q"]
    result = subprocess.run(args)
    sys.exit(result.returncode)


if __name__ == "__main__":
    cli()
```

Note: `aep conformance` shells out to pytest against the existing conformance test. This keeps a single conformance source of truth. If `tests/test_conformance.py` requires the package installed, run the CLI from `implementations/python`.

- [ ] **Step 7: Run CLI tests**

Run: `cd implementations/python && python -m pytest tests/test_cli.py -q`
Expected: PASS.

- [ ] **Step 8: Commit and push**

```bash
git add implementations/python/pyproject.toml implementations/python/src/aep/cli/__init__.py implementations/python/src/aep/cli/main.py implementations/python/tests/test_cli.py
git commit -m "feat(python): add aep CLI with click"
git push origin master
```

---

## Task 7: CLI daemon round-trip and final verification

**Files:**
- Test: `implementations/python/tests/test_cli_daemon_e2e.py`

- [ ] **Step 1: Write failing e2e test**

Create `implementations/python/tests/test_cli_daemon_e2e.py`:

```python
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
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd implementations/python && python -m pytest tests/test_cli_daemon_e2e.py -q`
Expected: PASS. This exercises the daemon and HTTP api end to end.

- [ ] **Step 3: Run the full Python suite**

Run: `cd implementations/python && python -m pytest`
Expected: all tests pass.

- [ ] **Step 4: Commit and push**

```bash
git add implementations/python/tests/test_cli_daemon_e2e.py
git commit -m "test(python): add daemon HTTP api round-trip e2e"
git push origin master
```

---

## Final Verification

- [ ] **Run full Python suite**

Run: `cd implementations/python && python -m pytest`
Expected: all tests pass.

- [ ] **Verify git sync**

Run: `git status -sb`
Expected: `## master...origin/master` with no changed files.
