# Multi-Language MCP Bridge Design: Python, Go, Java

Date: 2026-07-11
Status: approved for implementation planning

## Goal

Port the TypeScript MCP bridge to Python, Go, and Java: a JSON-RPC 2.0 handler exposing MCP `initialize`, `tools/list`, and `tools/call`, plus an async tool handler that emits AEP task lifecycle events. Go and Java first upgrade their `TaskTracker` to a full, reusable lifecycle API so the bridge can compose it cleanly. All three languages advance in the same round, each as its own implementation plan.

## Baseline

TypeScript reference: `reference/typescript/src/bridge/mcp-bridge.js`.

- `McpBridge`: registers tools, handles JSON-RPC requests (`initialize`, `notifications/initialized`, `tools/list`, `tools/call`), returns JSON-RPC 2.0 responses.
- `asyncToolHandler(name, { description, inputSchema, work })`: on `tools/call`, creates a `TaskTracker`, emits `task.accepted` synchronously, returns `{ content: [...] }`, and asynchronously emits `task.started`, `task.progress`, then `task.completed` or `task.failed` through a transport sink.

## Task Lifecycle Prerequisite (Go, Java)

Python's `TaskTracker` already exposes `accepted()`, `started()`, `progress()`, `completed()`, `failed()` returning event dicts, plus `.id`. Go and Java do not. Before the bridge:

- **Go** (`aep/harness.go` or a new `aep/task.go`): add exported methods `Accepted()`, `Started()`, `Progress(map[string]any)`, `Completed(map[string]any)`, `Failed(code, message string)` that return `map[string]any` AEP task events, mirroring the existing private `transition`. `ID` is already an exported field. Keep `Accept()` working (it may delegate to `Accepted()`), so `handler` behavior in the harness is unchanged.
- **Java** (`Harness.TaskTracker`): promote to a standalone public class `com.axisrobo.aep.TaskTracker` (own file) with a public constructor `(String id, String source)`, a `String id()` accessor, and public methods `accepted()`, `started()`, `progress(Map)`, `completed(Map)`, `failed(code, message)` returning `Map<String, Object>`. Update `Harness` to use the standalone class; keep harness behavior identical.

These upgrades are additive; existing harness/task tests must stay green.

## Scope

### In Scope (per language)

1. Task lifecycle upgrade (Go, Java only) as described above.
2. `McpBridge`:
   - Register tools with a name, schema (description, properties, required), and handler.
   - `handleRequest(request)` dispatch:
     - `initialize` → returns protocol version, capabilities `{ tools: {} }`, server info.
     - `notifications/initialized` → no response (null).
     - `tools/list` → returns tool list with input schemas.
     - `tools/call` → invokes the tool handler, wraps result; unknown tool → JSON-RPC error `-32602`; handler exception → `{ isError: true, content: [...] }`.
     - unknown method → JSON-RPC error `-32601`.
     - malformed request → JSON-RPC error `-32600`.
3. Async tool handler helper:
   - Creates a `TaskTracker`, emits `task.accepted` to the transport sink, returns MCP content immediately, then asynchronously emits `task.started`, `task.progress`, and terminal `task.completed`/`task.failed`.
4. A runnable example mirroring the TS demo where practical.

### Out Of Scope

- No MCP stdio server wiring beyond what the bridge needs (the bridge handles request objects; transport framing stays out).
- No changes to TypeScript.
- No protocol changes.

## Shared Conventions

### JSON-RPC Response Shapes

`initialize` result:

```json
{ "protocolVersion": "0.1.0", "capabilities": { "tools": {} }, "serverInfo": { "name": "aep-mcp-bridge", "version": "0.1.0" } }
```

`tools/list` result:

```json
{ "tools": [ { "name": "...", "description": "...", "inputSchema": { "type": "object", "properties": {}, "required": [] } } ] }
```

`tools/call` success: `{ "jsonrpc": "2.0", "id": <id>, "result": <handler result> }`.

Errors: `{ "jsonrpc": "2.0", "id": <id|null>, "error": { "code": <code>, "message": "..." } }` with codes `-32600` (invalid request), `-32601` (method not found), `-32602` (invalid params / unknown tool).

### Async Tool Handler Behavior

- On call: create tracker with `task_id` from `args._task_id` or generated; source `tool:<name>`; session from `args._session_id`.
- Emit `task.accepted` to the sink synchronously.
- Return MCP content: `{ "content": [ { "type": "text", "text": "{\"task_id\":\"<id>\",\"status\":\"accepted\"}" } ] }`.
- Asynchronously: emit `task.started`, `task.progress` (`{ progress: 0.5, message }`), run `work`, then emit `task.completed(result)` or, on error, `task.failed(TOOL_ERROR, message)`.

### Transport Sink

Each language uses the simplest sink:

- Python: any object with `send(event)` (matches existing `Transport`).
- Go: a `Sender` interface with `Send(map[string]any) error`, or a `func(map[string]any)`; the bridge defines a minimal interface.
- Java: a `@FunctionalInterface` sink `void send(Map<String,Object> event)`.

Sink may be null; the bridge tolerates a nil/None sink (no-op).

## Per-Language Notes

### Python (`reference/python`)

- No task upgrade needed.
- New `aep/mcp_bridge.py` with `McpBridge` and `async_tool_handler`. Async emission uses a background thread or `asyncio` task; tests can call a synchronous drain or await completion.
- Export from `aep/__init__.py`.

### Go (`reference/go`)

- Upgrade `TaskTracker` with exported lifecycle methods returning events.
- New `aep/mcp_bridge.go` with `McpBridge`, `RegisterTool`, `HandleRequest(map[string]any) map[string]any`, and an async tool handler helper. Async emission uses a goroutine; tests synchronize via a channel or `sync.WaitGroup`.
- Define a minimal `Sender` interface in the bridge file.

### Java (`reference/java`)

- Promote `TaskTracker` to a public standalone class; update `Harness`.
- New `com.axisrobo.aep.McpBridge` with tool registration, `handleRequest(Map) -> Map`, and an async tool handler. Async emission uses a thread or executor; tests synchronize via a latch/future.
- Define a `@FunctionalInterface` event sink.

## Error Handling

- Malformed or missing `method` → `-32600`.
- Unknown method → `-32601`.
- Unknown tool on `tools/call` → `-32602`.
- Tool handler exception → JSON-RPC success envelope with `{ isError: true, content: [{ type: "text", text: message }] }` (matches TS).
- Async `work` failure → `task.failed` event with `TOOL_ERROR`.

## Testing Strategy

Each language keeps its existing suite green and adds:

- Task lifecycle upgrade tests (Go, Java): `Accepted/Started/Progress/Completed/Failed` return correctly typed events with the right `type` and `task_id`.
- MCP bridge tests:
  - `initialize` returns server info and capabilities.
  - `tools/list` returns registered tools with input schema.
  - `tools/call` on a sync tool returns the handler result.
  - unknown tool returns `-32602`; unknown method returns `-32601`; malformed request returns `-32600`.
  - async tool handler: `tools/call` returns accepted content and, after async completion, the sink received `task.accepted`, `task.started`, `task.progress`, and `task.completed` (and `task.failed` on a failing tool).

## Success Criteria

- Python, Go, and Java each expose an MCP bridge with JSON-RPC `initialize`/`tools/list`/`tools/call` and an async tool handler emitting AEP task lifecycle events.
- Go and Java `TaskTracker` provide a full, reusable lifecycle API.
- All four language suites remain green.
