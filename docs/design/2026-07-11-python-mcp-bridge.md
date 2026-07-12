# Python MCP Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the TypeScript MCP bridge to Python: a JSON-RPC 2.0 `McpBridge` (initialize, tools/list, tools/call) and an `async_tool_handler` that emits AEP task lifecycle events.

**Architecture:** A new `aep/mcp_bridge.py` provides `McpBridge` (tool registry + JSON-RPC dispatch) and `async_tool_handler` (creates a `TaskTracker`, emits `task.accepted` synchronously, returns MCP content, then emits `task.started`/`task.progress`/`task.completed`/`task.failed` from a background thread to a transport sink). Python's `TaskTracker` already exposes the full lifecycle, so no task upgrade is needed.

**Tech Stack:** Python 3.12+, stdlib `threading`, `pytest`.

**Design reference:** `docs/superpowers/specs/2026-07-11-multi-language-mcp-bridge-design.md`

---

## File Structure

- Create `implementations/python/src/aep/mcp_bridge.py`: `McpBridge` + `async_tool_handler`.
- Modify `implementations/python/src/aep/__init__.py`: export both.
- Create `implementations/python/tests/test_mcp_bridge.py`.

---

## Task 1: McpBridge JSON-RPC handler

**Files:**
- Create: `implementations/python/src/aep/mcp_bridge.py`
- Modify: `implementations/python/src/aep/__init__.py`
- Test: `implementations/python/tests/test_mcp_bridge.py`

- [ ] **Step 1: Write failing tests**

Create `implementations/python/tests/test_mcp_bridge.py`:

```python
from aep.mcp_bridge import McpBridge


def test_initialize_returns_server_info():
    bridge = McpBridge()
    resp = bridge.handle_request({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}})
    assert resp["result"]["serverInfo"]["name"] == "aep-mcp-bridge"
    assert resp["result"]["capabilities"] == {"tools": {}}
    assert resp["result"]["protocolVersion"] == "0.1.0"


def test_notifications_initialized_returns_none():
    bridge = McpBridge()
    assert bridge.handle_request({"jsonrpc": "2.0", "method": "notifications/initialized"}) is None


def test_tools_list_returns_registered_tools():
    bridge = McpBridge()
    bridge.register_tool({
        "name": "echo",
        "schema": {"description": "echo tool", "properties": {"text": {"type": "string"}}, "required": ["text"]},
        "handler": lambda args, ctx: {"content": [{"type": "text", "text": args["text"]}]},
    })
    resp = bridge.handle_request({"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
    tools = resp["result"]["tools"]
    assert len(tools) == 1
    assert tools[0]["name"] == "echo"
    assert tools[0]["inputSchema"]["required"] == ["text"]


def test_tools_call_invokes_handler():
    bridge = McpBridge()
    bridge.register_tool({
        "name": "echo",
        "schema": {"description": "echo tool"},
        "handler": lambda args, ctx: {"content": [{"type": "text", "text": args["text"]}]},
    })
    resp = bridge.handle_request({"jsonrpc": "2.0", "id": 3, "method": "tools/call",
                                  "params": {"name": "echo", "arguments": {"text": "hi"}}})
    assert resp["result"]["content"][0]["text"] == "hi"


def test_unknown_tool_returns_error():
    bridge = McpBridge()
    resp = bridge.handle_request({"jsonrpc": "2.0", "id": 4, "method": "tools/call",
                                  "params": {"name": "missing", "arguments": {}}})
    assert resp["error"]["code"] == -32602


def test_unknown_method_returns_error():
    bridge = McpBridge()
    resp = bridge.handle_request({"jsonrpc": "2.0", "id": 5, "method": "bogus"})
    assert resp["error"]["code"] == -32601


def test_malformed_request_returns_error():
    bridge = McpBridge()
    resp = bridge.handle_request({})
    assert resp["error"]["code"] == -32600


def test_handler_exception_returns_is_error():
    bridge = McpBridge()
    def boom(args, ctx):
        raise ValueError("kaboom")
    bridge.register_tool({"name": "boom", "schema": {}, "handler": boom})
    resp = bridge.handle_request({"jsonrpc": "2.0", "id": 6, "method": "tools/call",
                                  "params": {"name": "boom", "arguments": {}}})
    assert resp["result"]["isError"] is True
    assert "kaboom" in resp["result"]["content"][0]["text"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd implementations/python && python -m pytest tests/test_mcp_bridge.py -q`
Expected: FAIL with `ModuleNotFoundError: No module named 'aep.mcp_bridge'`.

- [ ] **Step 3: Implement McpBridge**

Create `implementations/python/src/aep/mcp_bridge.py`:

```python
import json
import threading

from .harness import AepHarness
from .task import TaskTracker
from .errors import ErrorCode


class McpBridge:
    def __init__(self, aep=None, transport=None, server_info=None):
        self.aep = aep or AepHarness()
        self.transport = transport
        self.tools = {}
        self.server_info = server_info or {"name": "aep-mcp-bridge", "version": "0.1.0"}

    def register_tool(self, tool_def: dict):
        self.tools[tool_def["name"]] = {
            "handler": tool_def["handler"],
            "schema": tool_def.get("schema", {}),
        }
        return self

    def handle_request(self, request: dict):
        if not request or not request.get("method"):
            return self._error(None, -32600, "Invalid Request")
        method = request["method"]
        if method == "initialize":
            return self._handle_initialize(request)
        if method == "notifications/initialized":
            return None
        if method == "tools/list":
            return self._handle_tools_list(request)
        if method == "tools/call":
            return self._handle_tools_call(request)
        return self._error(request.get("id"), -32601, f"Method not found: {method}")

    def _handle_initialize(self, request):
        return {
            "jsonrpc": "2.0",
            "id": request.get("id"),
            "result": {
                "protocolVersion": "0.1.0",
                "capabilities": {"tools": {}},
                "serverInfo": self.server_info,
            },
        }

    def _handle_tools_list(self, request):
        tool_list = []
        for name, entry in self.tools.items():
            schema = entry["schema"]
            tool_list.append({
                "name": name,
                "description": schema.get("description", f"AEP-backed tool: {name}"),
                "inputSchema": {
                    "type": "object",
                    "properties": schema.get("properties", {}),
                    "required": schema.get("required", []),
                },
            })
        return {"jsonrpc": "2.0", "id": request.get("id"), "result": {"tools": tool_list}}

    def _handle_tools_call(self, request):
        params = request.get("params") or {}
        name = params.get("name")
        args = params.get("arguments") or {}
        if name not in self.tools:
            return self._error(request.get("id"), -32602, f"Unknown tool: {name}")
        handler = self.tools[name]["handler"]
        try:
            result = handler(args, {
                "aep": self.aep,
                "transport": self.transport,
                "task_id": args.get("_task_id"),
                "session_id": args.get("_session_id"),
            })
            return {"jsonrpc": "2.0", "id": request.get("id"), "result": result}
        except Exception as err:
            return {"jsonrpc": "2.0", "id": request.get("id"), "result": {
                "isError": True,
                "content": [{"type": "text", "text": str(err)}],
            }}

    def _error(self, request_id, code, message):
        return {"jsonrpc": "2.0", "id": request_id, "error": {"code": code, "message": message}}
```

- [ ] **Step 4: Export from the package**

In `implementations/python/src/aep/__init__.py`, add an import and `__all__` entries:

```python
from .mcp_bridge import McpBridge, async_tool_handler
```

Add `"McpBridge"` and `"async_tool_handler"` to the `__all__` list.

Note: `async_tool_handler` is created in Task 2. To keep the package importable after Task 1, add a placeholder later or implement Task 2 before running the full suite. For Task 1, temporarily import only `McpBridge`:

```python
from .mcp_bridge import McpBridge
```

and add `"McpBridge"` to `__all__`. The `async_tool_handler` export is added in Task 2.

- [ ] **Step 5: Run bridge tests**

Run: `cd implementations/python && python -m pytest tests/test_mcp_bridge.py -q`
Expected: PASS.

- [ ] **Step 6: Commit and push**

```bash
git add implementations/python/src/aep/mcp_bridge.py implementations/python/src/aep/__init__.py implementations/python/tests/test_mcp_bridge.py
git commit -m "feat(python): add MCP bridge JSON-RPC handler"
git push origin master
```

---

## Task 2: Async tool handler

**Files:**
- Modify: `implementations/python/src/aep/mcp_bridge.py`
- Modify: `implementations/python/src/aep/__init__.py`
- Test: `implementations/python/tests/test_mcp_bridge.py`

- [ ] **Step 1: Write failing tests**

Append to `implementations/python/tests/test_mcp_bridge.py`:

```python
import time


class _Sink:
    def __init__(self):
        self.events = []
    def send(self, event):
        self.events.append(event)


def _wait_for_type(sink, event_type, timeout=2.0):
    deadline = time.time() + timeout
    while time.time() < deadline:
        if any(e["type"] == event_type for e in sink.events):
            return True
        time.sleep(0.02)
    return False


def test_async_tool_handler_emits_lifecycle():
    from aep.mcp_bridge import McpBridge, async_tool_handler
    sink = _Sink()
    bridge = McpBridge(transport=sink)
    bridge.register_tool(async_tool_handler("build", {
        "description": "build tool",
        "work": lambda args, ctx: {"artifact": "app.bin"},
    }))
    resp = bridge.handle_request({"jsonrpc": "2.0", "id": 1, "method": "tools/call",
                                  "params": {"name": "build", "arguments": {"_task_id": "task_x"}}})
    accepted_content = resp["result"]["content"][0]["text"]
    assert "accepted" in accepted_content
    assert _wait_for_type(sink, "task.completed")
    types = [e["type"] for e in sink.events]
    assert "task.accepted" in types
    assert "task.started" in types
    assert "task.progress" in types
    assert "task.completed" in types


def test_async_tool_handler_emits_failed_on_error():
    from aep.mcp_bridge import McpBridge, async_tool_handler
    sink = _Sink()
    bridge = McpBridge(transport=sink)
    def boom(args, ctx):
        raise ValueError("build failed")
    bridge.register_tool(async_tool_handler("build", {"description": "d", "work": boom}))
    bridge.handle_request({"jsonrpc": "2.0", "id": 1, "method": "tools/call",
                           "params": {"name": "build", "arguments": {"_task_id": "task_y"}}})
    assert _wait_for_type(sink, "task.failed")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd implementations/python && python -m pytest tests/test_mcp_bridge.py -q -k async_tool`
Expected: FAIL with `ImportError: cannot import name 'async_tool_handler'`.

- [ ] **Step 3: Implement async_tool_handler**

Append to `implementations/python/src/aep/mcp_bridge.py`:

```python
def async_tool_handler(name: str, options: dict):
    description = options.get("description")
    input_schema = options.get("input_schema", {})
    work = options["work"]

    def handler(args, ctx):
        tracker = TaskTracker(
            task_id=args.get("_task_id") or None,
            source=f"tool:{name}",
            session_id=ctx.get("session_id"),
            description=json.dumps(args),
        )
        transport = ctx.get("transport")

        def _send(event):
            if transport is not None:
                transport.send(event)

        _send(tracker.accepted())

        def _run():
            try:
                _send(tracker.started())
                _send(tracker.progress({"progress": 0.5, "message": f"{name} in progress"}))
                result = work(args, {"tracker": tracker, "ctx": ctx})
                _send(tracker.completed(result))
            except Exception as err:
                _send(tracker.failed(ErrorCode.TOOL_ERROR, str(err)))

        threading.Thread(target=_run, daemon=True).start()

        return {"content": [{"type": "text", "text": json.dumps({"task_id": tracker.id, "status": "accepted"})}]}

    return {
        "name": name,
        "schema": {
            "description": description,
            "properties": input_schema.get("properties", {}),
            "required": input_schema.get("required", []),
        },
        "handler": handler,
    }
```

- [ ] **Step 4: Update the package export**

In `implementations/python/src/aep/__init__.py`, change the import to include both and ensure `__all__` has both:

```python
from .mcp_bridge import McpBridge, async_tool_handler
```

Add `"async_tool_handler"` to `__all__` if not already present.

- [ ] **Step 5: Run bridge tests**

Run: `cd implementations/python && python -m pytest tests/test_mcp_bridge.py -q`
Expected: PASS.

- [ ] **Step 6: Commit and push**

```bash
git add implementations/python/src/aep/mcp_bridge.py implementations/python/src/aep/__init__.py implementations/python/tests/test_mcp_bridge.py
git commit -m "feat(python): add async tool handler emitting task lifecycle"
git push origin master
```

---

## Task 3: Final verification

- [ ] **Step 1: Run full Python suite**

Run: `cd implementations/python && python -m pytest`
Expected: all tests pass.

- [ ] **Step 2: Verify import surface**

Run: `cd implementations/python && python -c "from aep import McpBridge, async_tool_handler; print('ok')"`
Expected: prints `ok`.

- [ ] **Step 3: Verify git sync**

Run: `git status -sb`
Expected: `## master...origin/master` with no changed files.
