# Harmovela Integration Scenarios

Three end-to-end scenarios demonstrating Harmovela's coordination dimensions working together.

---

## 1. Async Task Orchestration

**Narrative:** An autonomous agent submits a long-running tool task (e.g. code analysis across a large repository), receives incremental progress events and a final completion event, and may cancel the task mid-flight.

**Coordination Dimensions:** Task, Delegation

### Interaction Steps

| Step | Actor | Action | Event Types |
|------|-------|--------|-------------|
| 1 | Agent | Submits a task via `publish` | `task.submitted` |
| 2 | Runtime | Acknowledges and enqueues the task | `task.accepted` |
| 3 | Worker | Picks up the task and starts processing | `task.started` |
| 4 | Worker | Reports progress periodically | `task.progress` |
| 5 | Worker | Completes the task with a result | `task.completed` |
| 5a | Agent | (optional) Sends cancellation request | `task.cancelled` |

### Code References

| File | Description |
|------|-------------|
| `examples/quickstart/runtime-embed.*` | Minimal in-process runtime: create service, subscribe, publish, receive task events |
| `examples/service-client/emit-subscribe.js` | WebSocket client: emit a task event and subscribe to receive it |
| `examples/service-client/http-subscribe.js` | HTTP API client: create subscription, publish event, long-poll for delivery |

### Expected Output

The quickstart runtime-embed example produces:

```
received task.submitted evt_embed
```

The service-client examples produce:

```
received task.submitted evt_ws_example
```
```
received evt_http
```

### Related Specifications

- `docs/protocol/task-lifecycle.md` — full task state machine and lifecycle events
- `docs/protocol/delivery.md` — ack protocol, at-least-once and at-most-once semantics
- `docs/protocol/reliability.md` — retry policy, dead-letter, durability

---

## 2. Context and Memory Coordination

**Narrative:** A memory system emits fact changes (additions, invalidations) and retrieval results while a context provider signals context invalidations (e.g. user navigated to a new page). An agent subscriber holds active subscriptions to both `memory.*` and `context.*` events and reacts as they arrive.

**Coordination Dimensions:** Event, State, Context / Memory

### Interaction Steps

| Step | Actor | Action | Event Types |
|------|-------|--------|-------------|
| 1 | Agent | Opens a session and subscribes to `memory.*` and `context.*` | `subscription.requested` → `subscription.ready` |
| 2 | Context Provider | Signals that the current context is invalidated | `context.invalidated` |
| 3 | Memory System | Adds a new fact with confidence score | `memory.fact.added` |
| 4 | Context Provider | Reports that a new snapshot is ready | `context.snapshot.ready` |
| 5 | Memory System | Returns results for a retrieval query | `memory.retrieval.ready` |
| 6 | Non-matching Source | Sends an event the agent is NOT subscribed to | *(rejected — no matching subscription)* |
| 7 | Memory System | Invalidates a previously recorded fact | `memory.fact.invalidated` |
| 8 | Agent | Closes the session | `session.closed` |

### Code References

| File | Description |
|------|-------------|
| `examples/scenarios/agent-subscriber.js` | Agent subscribes to memory + context events, processes incoming events, handles rejection for unsubscribed types |
| `examples/scenarios/memory-producer.js` | Memory system produces fact, retrieval, preference, and invalidation events, routes them via subscription matching |

### Expected Output

Agent subscriber output (abridged):

```
=== Agent Subscriber Demo ===
[agent] Opening session...
  ← session.ready
[agent] Subscribing to memory.* + context.* ...
  ← subscription.ready sub_memory_context
[agent] Processing incoming events...
  [ack] context.invalidated → user navigated to new page
  [ack] memory.fact.added → fact_101
  [ack] context.snapshot.ready → /results
  [reject] task.progress — subscription filter mismatch
  [ack] memory.retrieval.ready → Harmovela events
[agent] Closing session...
  ← session.closed
```

Memory producer output (abridged):

```
=== Memory Event Producer Demo ===
[agent] Subscribes to memory.* events for conv_demo
[memory] Emitting 5 memory events...
  [send] memory.fact.added
  [send] memory.preference.updated
  [send] memory.summary.ready
  [send] memory.fact.invalidated
  [send] memory.retrieval.ready
=== Events Delivered ===
  [memory.fact.added] fact_001
  [memory.preference.updated] response_style
  ...
```

### Related Specifications

- `docs/protocol/subscription.md` — subscription model, filter matching, wildcard patterns
- `docs/protocol/session.md` — session lifecycle and state management
- `docs/protocol/event-registry-governance.md` — event type registry and family governance

---

## 3. MCP Bridge with Async Feedback

**Narrative:** A synchronous MCP `tools/call` request arrives at the bridge. The bridge delegates the work to an async Harmovela task handler, returns an MCP `accepted` response immediately, and emits `task.submitted`, `task.started`, and `task.completed` lifecycle events through the transport as the work progresses — all within the same process.

**Coordination Dimensions:** Event, Task, Recovery

### Interaction Steps

| Step | Actor | Action | Wire |
|------|-------|--------|------|
| 1 | MCP Client | Calls `tools/call` for async tool `"build"` | MCP request (JSON-RPC `2.0`) |
| 2 | McpBridge | Registers the tool via `asyncToolHandler`, creates a task tracker | Internal |
| 3 | McpBridge | Emits `task.submitted` lifecycle event | Harmovela transport |
| 4 | McpBridge | Emits `task.started` lifecycle event | Harmovela transport |
| 5 | Tool Handler | Executes the work function (e.g. produces `app.bin` artifact) | Internal |
| 6 | McpBridge | Emits `task.completed` with result payload | Harmovela transport |
| 7 | MCP Client | Receives `accepted` response with content (artifact, task_id) | MCP response |

The MCP response is returned synchronously, while the full lifecycle event stream is observable through the transport for downstream consumers (dashboards, audit logs, downstream agents).

### Code References

| File | Description |
|------|-------------|
| `examples/mcp-bridge/async-tool.*` | Registers an async `"build"` tool, calls it, observes lifecycle events across all 4 languages |

### Expected Output

```
tools/call response: [{"type":"text","text":"{\"artifact\":\"app.bin\",\"task_id\":\"task_demo\"}"}]
lifecycle events: task.submitted → task.started → task.completed
```

### Related Specifications

- `docs/mcp-relationship.md` — MCP comparison and interop model
- `docs/protocol/task-lifecycle.md` — task state machine
- `docs/protocol/reliability.md` — retry and dead-letter for bridge-delegated tasks
- Implementations: `implementations/typescript/src/bridge/` (TypeScript), `implementations/go/aep/bridge/` (Go), `implementations/python/src/aep/mcp_bridge.py` (Python), `implementations/java/.../McpBridge.java` (Java)
