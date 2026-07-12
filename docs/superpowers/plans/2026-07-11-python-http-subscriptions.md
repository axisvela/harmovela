# Python HTTP Subscriptions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Python runtime to parity with TypeScript HTTP subscriptions: subscription persistence in every delivery store, a runtime subscription registry with buffered fanout, and HTTP subscription CRUD + long-poll + SSE endpoints.

**Architecture:** Delivery stores gain subscription CRUD. `AepRuntimeService` gains a subscription registry that loads persisted subscriptions on start, fans matching events into per-subscription buffers on publish, and exposes drain/attach. The stdlib `http.server` api server adds subscription routes, long-poll, and SSE.

**Tech Stack:** Python 3.12+, stdlib `http.server`, `pytest`, existing `subscription_matches`.

**Design reference:** `docs/superpowers/specs/2026-07-11-multi-language-http-subscriptions-design.md`

---

## File Structure

- Modify `implementations/python/src/aep/delivery_store.py`, `sqlite_delivery_store.py`, `postgres_delivery_store.py`: subscription CRUD.
- Modify `implementations/python/src/aep/runtime/service.py`: subscription registry + fanout.
- Modify `implementations/python/src/aep/runtime/api_server.py`: subscription routes, long-poll, SSE.
- Add tests under `implementations/python/tests/`.

---

## Task 1: Delivery store subscription CRUD

**Files:**
- Modify: `implementations/python/src/aep/delivery_store.py`
- Modify: `implementations/python/src/aep/sqlite_delivery_store.py`
- Modify: `implementations/python/src/aep/postgres_delivery_store.py`
- Test: `implementations/python/tests/test_delivery_store.py`, `tests/test_sqlite_delivery_store.py`, `tests/test_postgres_delivery_store.py`

- [ ] **Step 1: Write failing tests**

Append to `implementations/python/tests/test_delivery_store.py`:

```python
def test_subscription_crud():
    store = InMemoryDeliveryStore()
    store.create_subscription({"id": "sub_1", "filter": {"types": "task.*"}, "created_at": "2026-07-11T10:00:00Z"})
    assert store.get_subscription("sub_1")["filter"]["types"] == "task.*"
    assert len(store.list_subscriptions()) == 1
    assert store.delete_subscription("sub_1") is True
    assert store.get_subscription("sub_1") is None
    assert store.delete_subscription("sub_1") is False
```

Append to `implementations/python/tests/test_sqlite_delivery_store.py`:

```python
def test_subscription_crud():
    store = SqliteDeliveryStore(":memory:")
    store.create_subscription({"id": "sub_1", "filter": {"types": "task.*"}, "created_at": "2026-07-11T10:00:00Z"})
    assert store.get_subscription("sub_1")["filter"]["types"] == "task.*"
    assert len(store.list_subscriptions()) == 1
    assert store.delete_subscription("sub_1") is True
    assert store.get_subscription("sub_1") is None
    assert store.delete_subscription("sub_1") is False
    store.close()
```

Append to `implementations/python/tests/test_postgres_delivery_store.py`:

```python
def test_subscription_crud(store):
    store.create_subscription({"id": "sub_1", "filter": {"types": "task.*"}, "created_at": "2026-07-11T10:00:00Z"})
    assert store.get_subscription("sub_1")["filter"]["types"] == "task.*"
    assert len(store.list_subscriptions()) == 1
    assert store.delete_subscription("sub_1") is True
    assert store.get_subscription("sub_1") is None
    assert store.delete_subscription("sub_1") is False
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd implementations/python && python -m pytest tests/test_delivery_store.py tests/test_sqlite_delivery_store.py -q`
Expected: FAIL with `AttributeError: ... has no attribute 'create_subscription'`.

- [ ] **Step 3: Implement in-memory subscription CRUD**

In `implementations/python/src/aep/delivery_store.py`, add to `__init__` after `self._dead_lettered`:

```python
        self._subscriptions: dict[str, dict] = {}
```

Add methods to the class (after `get_dead_lettered`):

```python
    def create_subscription(self, record: dict) -> dict:
        self._subscriptions[record["id"]] = record
        return record

    def get_subscription(self, subscription_id: str) -> dict | None:
        return self._subscriptions.get(subscription_id)

    def list_subscriptions(self) -> list[dict]:
        return list(self._subscriptions.values())

    def delete_subscription(self, subscription_id: str) -> bool:
        return self._subscriptions.pop(subscription_id, None) is not None
```

- [ ] **Step 4: Implement sqlite subscription CRUD**

In `implementations/python/src/aep/sqlite_delivery_store.py` `_init_schema`, add a table inside the `executescript` block:

```python
            CREATE TABLE IF NOT EXISTS delivery_subscriptions (
                id TEXT PRIMARY KEY,
                filter TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
```

Add methods (after `get_dead_lettered`):

```python
    def create_subscription(self, record: dict) -> dict:
        self._db.execute(
            "INSERT OR REPLACE INTO delivery_subscriptions (id, filter, created_at) VALUES (?,?,?)",
            (record["id"], json.dumps(record.get("filter", {})), record["created_at"]),
        )
        self._db.commit()
        return record

    def get_subscription(self, subscription_id: str) -> dict | None:
        row = self._db.execute(
            "SELECT id, filter, created_at FROM delivery_subscriptions WHERE id = ?", (subscription_id,)
        ).fetchone()
        return self._row_to_subscription(row) if row else None

    def list_subscriptions(self) -> list[dict]:
        rows = self._db.execute(
            "SELECT id, filter, created_at FROM delivery_subscriptions ORDER BY created_at"
        ).fetchall()
        return [self._row_to_subscription(r) for r in rows]

    def delete_subscription(self, subscription_id: str) -> bool:
        cur = self._db.execute("DELETE FROM delivery_subscriptions WHERE id = ?", (subscription_id,))
        self._db.commit()
        return cur.rowcount > 0

    @staticmethod
    def _row_to_subscription(row) -> dict:
        return {"id": row["id"], "filter": json.loads(row["filter"]), "created_at": row["created_at"]}
```

`import json` is already present in this file.

- [ ] **Step 5: Implement postgres subscription CRUD**

In `implementations/python/src/aep/postgres_delivery_store.py` `_init_schema`, add a table to the `CREATE TABLE` statements:

```python
                CREATE TABLE IF NOT EXISTS {self._t('subscriptions')} (
                    id TEXT PRIMARY KEY,
                    filter JSONB NOT NULL,
                    created_at TEXT NOT NULL
                );
```

Add methods (after `get_dead_lettered`):

```python
    def create_subscription(self, record: dict) -> dict:
        with self._conn.cursor() as cur:
            cur.execute(
                f"""INSERT INTO {self._t('subscriptions')} (id, filter, created_at) VALUES (%s,%s,%s)
                    ON CONFLICT (id) DO UPDATE SET filter=EXCLUDED.filter, created_at=EXCLUDED.created_at""",
                (record["id"], json.dumps(record.get("filter", {})), record["created_at"]),
            )
        return record

    def get_subscription(self, subscription_id: str) -> dict | None:
        with self._conn.cursor() as cur:
            cur.execute(
                f"SELECT id, filter, created_at FROM {self._t('subscriptions')} WHERE id = %s", (subscription_id,)
            )
            row = cur.fetchone()
        return self._row_to_subscription(row) if row else None

    def list_subscriptions(self) -> list[dict]:
        with self._conn.cursor() as cur:
            cur.execute(f"SELECT id, filter, created_at FROM {self._t('subscriptions')} ORDER BY created_at")
            rows = cur.fetchall()
        return [self._row_to_subscription(r) for r in rows]

    def delete_subscription(self, subscription_id: str) -> bool:
        with self._conn.cursor() as cur:
            cur.execute(f"DELETE FROM {self._t('subscriptions')} WHERE id = %s", (subscription_id,))
            return cur.rowcount > 0

    @staticmethod
    def _row_to_subscription(row) -> dict:
        filter_val = row[1] if isinstance(row[1], dict) else json.loads(row[1])
        return {"id": row[0], "filter": filter_val, "created_at": row[2]}
```

Also update the `close` drop path if `drop_on_close` drops tables. Read the `close` method; if it drops the four tables, add `{self._t('subscriptions')}` to the DROP list.

`import json` is already present.

- [ ] **Step 6: Run store tests**

Run: `cd implementations/python && python -m pytest tests/test_delivery_store.py tests/test_sqlite_delivery_store.py tests/test_postgres_delivery_store.py -q`
Expected: PASS.

- [ ] **Step 7: Commit and push**

```bash
git add implementations/python/src/aep/delivery_store.py implementations/python/src/aep/sqlite_delivery_store.py implementations/python/src/aep/postgres_delivery_store.py implementations/python/tests/test_delivery_store.py implementations/python/tests/test_sqlite_delivery_store.py implementations/python/tests/test_postgres_delivery_store.py
git commit -m "feat(python): add subscription CRUD to delivery stores"
git push origin master
```

---

## Task 2: Runtime subscription registry

**Files:**
- Modify: `implementations/python/src/aep/runtime/service.py`
- Test: `implementations/python/tests/test_runtime_subscriptions.py`

- [ ] **Step 1: Write failing tests**

Create `implementations/python/tests/test_runtime_subscriptions.py`:

```python
from aep.runtime.config import default_config
from aep.runtime.service import AepRuntimeService


def _event(**overrides):
    base = {
        "aep_version": "0.1", "id": "evt_1", "type": "task.submitted",
        "source": "test", "created_at": "2026-07-11T10:00:00Z", "payload": {},
    }
    base.update(overrides)
    return base


def _config():
    config = default_config()
    config["delivery"]["store"] = "memory"
    config["transports"]["websocket"]["enabled"] = False
    config["transports"]["sse"]["enabled"] = False
    config["transports"]["api"]["enabled"] = False
    return config


def test_registry_buffers_matching_events():
    service = AepRuntimeService(_config())
    service.start()
    record = service.create_subscription({"types": "task.*"})
    service.publish(_event(id="evt_match", type="task.submitted"))
    service.publish(_event(id="evt_skip", type="session.opened"))
    drained = service.take_events(record["id"], 100)
    assert len(drained) == 1
    assert drained[0]["id"] == "evt_match"
    assert service.take_events(record["id"], 100) == []
    service.stop()


def test_registry_lists_and_deletes():
    service = AepRuntimeService(_config())
    service.start()
    record = service.create_subscription({"types": "task.*"})
    assert len(service.list_subscriptions()) == 1
    assert service.get_subscription(record["id"]) is not None
    assert service.delete_subscription(record["id"]) is True
    assert service.get_subscription(record["id"]) is None
    service.stop()
```

Note: `session.opened` is a standard event type, so it validates but does not match `task.*`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd implementations/python && python -m pytest tests/test_runtime_subscriptions.py -q`
Expected: FAIL with `AttributeError: 'AepRuntimeService' object has no attribute 'create_subscription'`.

- [ ] **Step 3: Implement the registry**

In `implementations/python/src/aep/runtime/service.py`, update imports and add registry logic.

Change the imports at the top to add subscription matching and uuid/time:

```python
import uuid
from datetime import datetime, timezone

from ..router import EventRouter
from ..envelope import validate_envelope
from ..subscription import subscription_matches
from ..transport.websocket import WsServerTransport
from .config import create_delivery_store
from .api_server import start_api_server
```

Add to `__init__` after `self.transports = {}`:

```python
        self.subscriptions = {}
        self.max_buffer = 1000
```

In `publish`, after `self.router.dispatch(event)`, add fanout:

```python
        for entry in self.subscriptions.values():
            if subscription_matches({"payload": entry["record"]["filter"]}, event):
                entry["buffer"].append(event)
                if len(entry["buffer"]) > self.max_buffer:
                    entry["buffer"].pop(0)
                for sink in list(entry["sinks"]):
                    sink(event)
```

In `start`, after the api transport is created and before `self.started = True`, load persisted subscriptions:

```python
        persisted = []
        lister = getattr(self.store, "list_subscriptions", None)
        if callable(lister):
            persisted = lister()
        for record in persisted:
            self.subscriptions[record["id"]] = {"record": record, "buffer": [], "sinks": set()}
```

Add registry methods to the class (after `get_dead_lettered`):

```python
    def create_subscription(self, filter_: dict) -> dict:
        record = {
            "id": f"sub_{uuid.uuid4().hex}",
            "filter": filter_ or {},
            "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        }
        creator = getattr(self.store, "create_subscription", None)
        if callable(creator):
            creator(record)
        self.subscriptions[record["id"]] = {"record": record, "buffer": [], "sinks": set()}
        return record

    def list_subscriptions(self) -> list:
        return [entry["record"] for entry in self.subscriptions.values()]

    def get_subscription(self, subscription_id: str) -> dict | None:
        entry = self.subscriptions.get(subscription_id)
        return entry["record"] if entry else None

    def delete_subscription(self, subscription_id: str) -> bool:
        existed = self.subscriptions.pop(subscription_id, None) is not None
        deleter = getattr(self.store, "delete_subscription", None)
        if callable(deleter):
            deleter(subscription_id)
        return existed

    def take_events(self, subscription_id: str, max_count: int) -> list:
        entry = self.subscriptions.get(subscription_id)
        if not entry:
            return []
        taken = entry["buffer"][:max_count]
        entry["buffer"] = entry["buffer"][max_count:]
        return taken

    def attach_stream(self, subscription_id: str, sink):
        entry = self.subscriptions.get(subscription_id)
        if not entry:
            return None
        entry["sinks"].add(sink)
        def detach():
            entry["sinks"].discard(sink)
        return detach
```

- [ ] **Step 4: Run registry test**

Run: `cd implementations/python && python -m pytest tests/test_runtime_subscriptions.py -q`
Expected: PASS.

- [ ] **Step 5: Commit and push**

```bash
git add implementations/python/src/aep/runtime/service.py implementations/python/tests/test_runtime_subscriptions.py
git commit -m "feat(python): add runtime subscription registry with fanout"
git push origin master
```

---

## Task 3: Subscription CRUD and long-poll endpoints

**Files:**
- Modify: `implementations/python/src/aep/runtime/api_server.py`
- Test: `implementations/python/tests/test_runtime_subscriptions_api.py`

- [ ] **Step 1: Write failing tests**

Create `implementations/python/tests/test_runtime_subscriptions_api.py`:

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd implementations/python && python -m pytest tests/test_runtime_subscriptions_api.py -q`
Expected: FAIL because subscription routes return 404.

- [ ] **Step 3: Implement subscription routes**

Rewrite `implementations/python/src/aep/runtime/api_server.py` to handle subscription routes. Replace the `do_GET`, `do_POST`, and add `do_DELETE`, plus a route parser for `/subscriptions/:id[/events|/stream]`.

Replace the `Handler` class body's `do_GET` and `do_POST` with:

```python
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
            if route == "/subscriptions":
                return self._send(200, {"subscriptions": service.list_subscriptions()})
            sub_id, suffix = _parse_subscription_route(route)
            if sub_id is not None:
                if suffix is None:
                    record = service.get_subscription(sub_id)
                    return self._send(200, record) if record else self._send(404, {"error": "not found"})
                if suffix == "/events":
                    if service.get_subscription(sub_id) is None:
                        return self._send(404, {"error": "not found"})
                    return self._send(200, {"events": service.take_events(sub_id, 100)})
                if suffix == "/stream":
                    return self._handle_stream(sub_id)
            return self._send(404, {"error": "not found"})

        def do_POST(self):
            route = self._route()
            if route == "/events":
                return self._handle_ingest()
            if route == "/subscriptions":
                return self._handle_create_subscription()
            return self._send(404, {"error": "not found"})

        def do_DELETE(self):
            route = self._route()
            sub_id, suffix = _parse_subscription_route(route)
            if sub_id is not None and suffix is None:
                deleted = service.delete_subscription(sub_id)
                return self._send(200, {"deleted": True}) if deleted else self._send(404, {"error": "not found"})
            return self._send(404, {"error": "not found"})

        def _handle_ingest(self):
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

        def _handle_create_subscription(self):
            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length).decode() if length else ""
            try:
                body = json.loads(raw) if raw else {}
            except json.JSONDecodeError:
                return self._send(400, {"error": "invalid JSON body"})
            filter_ = body.get("filter", body) if isinstance(body, dict) else {}
            record = service.create_subscription(filter_)
            return self._send(201, record)

        def _handle_stream(self, sub_id):
            if service.get_subscription(sub_id) is None:
                return self._send(404, {"error": "not found"})
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(b": ok\n\n")
            self.wfile.flush()
            for evt in service.take_events(sub_id, 1000):
                self._write_sse(evt)
            import queue
            q = queue.Queue()
            detach = service.attach_stream(sub_id, lambda e: q.put(e))
            try:
                while True:
                    evt = q.get()
                    self._write_sse(evt)
            except (BrokenPipeError, ConnectionResetError, OSError):
                pass
            finally:
                if detach:
                    detach()

        def _write_sse(self, evt):
            self.wfile.write(f"data: {json.dumps(evt)}\n\n".encode())
            self.wfile.flush()
```

Add module-level helper after the imports:

```python
def _parse_subscription_route(route):
    if route is None or not route.startswith("/subscriptions/"):
        return None, None
    rest = route[len("/subscriptions/"):]
    if rest.endswith("/events"):
        return rest[:-len("/events")], "/events"
    if rest.endswith("/stream"):
        return rest[:-len("/stream")], "/stream"
    if "/" in rest:
        return None, None
    return rest, None
```

- [ ] **Step 4: Run subscription api tests**

Run: `cd implementations/python && python -m pytest tests/test_runtime_subscriptions_api.py -q`
Expected: PASS.

- [ ] **Step 5: Commit and push**

```bash
git add implementations/python/src/aep/runtime/api_server.py implementations/python/tests/test_runtime_subscriptions_api.py
git commit -m "feat(python): add HTTP subscription CRUD and long-poll endpoints"
git push origin master
```

---

## Task 4: SSE stream endpoint test

**Files:**
- Test: `implementations/python/tests/test_runtime_subscriptions_sse.py`

- [ ] **Step 1: Write SSE test**

Create `implementations/python/tests/test_runtime_subscriptions_sse.py`:

```python
import json
import threading
import time
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


def test_sse_stream_receives_matching_event():
    service = AepRuntimeService(_api_config())
    service.start()
    port = service.transports["api"].port
    base = f"http://127.0.0.1:{port}/aep/api"

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
        "aep_version": "0.1", "id": "evt_sse", "type": "task.submitted",
        "source": "t", "created_at": "2026-07-11T10:00:00Z", "payload": {},
    })
    t.join(timeout=3)
    assert any(e["id"] == "evt_sse" for e in received)
    service.stop()
```

- [ ] **Step 2: Run SSE test**

Run: `cd implementations/python && python -m pytest tests/test_runtime_subscriptions_sse.py -q`
Expected: PASS. The initial `: ok` flush ensures `urlopen` returns before the first event.

- [ ] **Step 3: Commit and push**

```bash
git add implementations/python/tests/test_runtime_subscriptions_sse.py
git commit -m "test(python): cover SSE subscription stream"
git push origin master
```

---

## Task 5: Final verification

- [ ] **Step 1: Run full Python suite**

Run: `cd implementations/python && python -m pytest`
Expected: all tests pass.

- [ ] **Step 2: Verify git sync**

Run: `git status -sb`
Expected: `## master...origin/master` with no changed files.
