# MCP Bridge with Async Feedback

> Status: draft. Part of the Harmovela 0.4 Beta integration scenarios.

## Narrative

A synchronous MCP `tools/call` request arrives at the bridge. The bridge delegates the work to an async Harmovela task handler, returns an MCP `accepted` response immediately, and emits `task.submitted` → `task.started` → `task.completed` lifecycle events through the transport as work progresses. Downstream consumers observe the full lifecycle event stream, and delivery semantics (acknowledgement, redelivery, dead-letter) ensure durability across disconnections and failures.

## Coordination Dimensions

Event, Task, Recovery

## Scenario A: MCP Sync-to-Async Bridge (Happy Path)

### Step-by-Step Event Sequence

| Step | Actor | Action | Wire / Event Type | Details |
|------|-------|--------|-------------------|---------|
| 1 | MCP Client | Calls `tools/call` for async tool `"build"` with `task_id: "task_demo"` | MCP request (JSON-RPC 2.0) | `method: "tools/call"`, `params.name: "build"`, `params.arguments._task_id: "task_demo"` |
| 2 | McpBridge | Registers `"build"` tool via `asyncToolHandler`, creates task tracker with `task_demo` ID | Internal | `bridge.registerTool(asyncToolHandler("build", { work }))` |
| 3 | McpBridge | Emits `task.submitted` lifecycle event | Harmovela transport | `type: "task.submitted"`, `task_id: "task_demo"`, `source: "harness:aep"` |
| 4 | McpBridge | Emits `task.accepted` — bridge accepts the work | Harmovela transport | `type: "task.accepted"`, `payload.state: "accepted"` |
| 5 | McpBridge | Emits `task.started` — begins executing the tool handler | Harmovela transport | `type: "task.started"`, `payload.state: "started"` |
| 6 | Tool Handler | Executes the work function, produces `app.bin` artifact | Internal (synchronous) | Work function returns `{ artifact: "app.bin", task_id: "task_demo" }` |
| 7 | McpBridge | Emits `task.completed` with result payload | Harmovela transport | `type: "task.completed"`, `payload.state: "completed"`, `payload.result` carries artifact info |
| 8 | MCP Client | Receives synchronous `accepted` response with content | MCP response | `result.content: [{ type: "text", text: "{\"artifact\":\"app.bin\",\"task_id\":\"task_demo\"}" }]` |

### Expected Output

```
tools/call response: [{"type":"text","text":"{\"artifact\":\"app.bin\",\"task_id\":\"task_demo\"}"}]
lifecycle events: task.submitted → task.started → task.completed
```

## Scenario B: Async Task with Progress Events

### Step-by-Step Event Sequence

| Step | Actor | Action | Event Type | Details |
|------|-------|--------|------------|---------|
| 1-3 | MCP Client / McpBridge | Submit and accept task | `task.submitted` → `task.accepted` | Standard task initiation |
| 4 | McpBridge | Emits task start | `task.started` | `payload.state: "started"` |
| 5 | Tool Handler (long-running) | Reports progress at 50% | `task.progress` | `payload.progress: 0.5`, `payload.message: "Working on task"` |
| 6 | Tool Handler | Produces partial output | `task.output` | `payload.state: "output"`, intermediate result streamed |
| 7 | Tool Handler | Reports further progress at 80% | `task.progress` | `payload.progress: 0.8` |
| 8 | McpBridge | Completes task | `task.completed` | `payload.state: "completed"`, `payload.result` carries final output |

## Scenario C: Durable Delivery with Ack, Redelivery, and Dead-Letter

### Step-by-Step Event Sequence

| Step | Actor | Action | Event Type | Details |
|------|-------|--------|------------|---------|
| 1 | Agent | Submits a crawler task with `at_least_once` delivery | `task.submitted` | `delivery.mode: "at_least_once"`, `delivery.sequence: 1` |
| 2 | Tool | Starts execution | `task.started` | `delivery.sequence: 2` |
| 3 | Tool | Reports progress | `task.progress` | `delivery.sequence: 3`, `payload.progress: 0.5` |
| 4 | Tool | Completes the task | `task.completed` | `delivery.sequence: 4` |
| 5 | Consumer | Acknowledges the completed event | `event.acknowledged` | `causation_id` references completion, `payload.acknowledged_event_id`, `payload.cursor: "stream:4"` |
| 6 | Producer (after consumer disconnect) | Redelivers unacknowledged `task.progress` event | `event.redelivered` | `payload.original_event_id` points to original progress, `payload.attempt: 2` |
| 7 | Harness (after exhaustion) | Routes to dead-letter after max attempts | `event.dead_lettered` | `payload.original_event_id`, `payload.attempts: 3`, `payload.error.code: "session_timeout"` |

### Delivery Tracker Verification (HARMOVELA-C3)

| Metric | Expected Value | Fixture |
|--------|---------------|---------|
| Pending events | 1 | `delivery-e2e.ndjson` |
| Acknowledged events | 1 | `delivery-e2e.ndjson` |
| Dead-lettered events | 1 | `delivery-e2e.ndjson` |

## Scenario D: Task Failure and Retry Through Bridge

| Step | Actor | Action | Event Type | Notes |
|------|-------|--------|------------|-------|
| 1-4 | Client/Bridge | Standard task initiation | `task.submitted` → `task.accepted` → `task.started` → `task.progress` | Task begins normally |
| 5 | Tool Handler | Encounters unrecoverable error | `task.failed` | `payload.error.code: "tool_error"`, `payload.error.retryable: true` |
| 6 | Bridge | (optional) Retries task as a new submission | `task.submitted` (new task_id) | New task linked via `causation_id` to failed task |
| 7 | Bridge | (optional) Dead-letters after max retries exhausted | `event.dead_lettered` | `payload.attempts: 3`, metadata preserved for manual inspection |

## Expected Outcomes

1. **Sync-to-async bridge (Scene A):** The MCP client receives an immediate response while the full Harmovela task lifecycle (submitted → accepted → started → completed) is emitted through the transport for downstream consumers (dashboards, audit logs, downstream agents).
2. **Progress and output streaming (Scene B):** Long-running tasks emit incremental `task.progress` and `task.output` events. Downstream subscribers tracking `task.*` can observe work-in-progress before the terminal event.
3. **Durable delivery (Scene C):** Events carry sequence numbers and cursors. Consumers acknowledge receipt via `event.acknowledged`. Unacknowledged events are redelivered (`event.redelivered`). Exhausted deliveries reach dead-letter (`event.dead_lettered`) with full metadata preservation.
4. **Failure and retry (Scene D):** Failed tasks with `retryable: true` may be retried. The retry policy (exponential backoff, max attempts) governs redelivery. Exhausted tasks route to dead-letter for operational inspection.

## Conformance Fixtures That Verify This Behavior

| Fixture | Level | Scenario Covered |
|---------|-------|-----------------|
| `conformance/fixtures/task-lifecycle.ndjson` | HARMOVELA-C1 | Scene A/B (submitted → accepted → started → progress → completed) |
| `conformance/fixtures/core-lifecycle.ndjson` | HARMOVELA-C1 | Scenes A/B (session + subscription + full task lifecycle) |
| `conformance/fixtures/task-output.ndjson` | HARMOVELA-C1 | Scene B (OUTPUT state, output→completed transition) |
| `conformance/fixtures/task-failed.ndjson` | HARMOVELA-C1 | Scene D (task failure terminal state) |
| `conformance/fixtures/task-cancelled.ndjson` | HARMOVELA-C1 | Cancellation terminal state |
| `conformance/fixtures/delivery.ndjson` | HARMOVELA-C2 (delivery profile) | Scene C (acknowledgement, redelivery, dead-letter sequence) |
| `conformance/fixtures/delivery-stateful.ndjson` | HARMOVELA-C2 (delivery profile) | Scene C (full task lifecycle + delivery events through harness stateful flow) |
| `conformance/fixtures/delivery-e2e.ndjson` | HARMOVELA-C3 (delivery profile) | Scene C (end-to-end: track→ack, track→nack, track→dead-letter, DeliveryTracker stats verification) |
| `conformance/fixtures/memory-context-ack.ndjson` | HARMOVELA-C0 | Scene C (event.acknowledged with causation_id linking) |

## Code References

| File | Description |
|------|-------------|
| `examples/mcp-bridge/async-tool.js` | TypeScript: registers async `"build"` tool, calls it, observes lifecycle events |
| `examples/mcp-bridge/async-tool.py` | Python: registers async `"build"` tool via `async_tool_handler` |
| `examples/mcp-bridge/async-tool.go` | Go: registers async `"build"` tool via `AsyncToolHandler` |
| `examples/mcp-bridge/async-tool.java` | Java: registers async `"build"` tool via `asyncToolHandler` |
| `implementations/typescript/src/bridge/` | TypeScript MCP bridge and async tool handler |

## Related Specifications

- `docs/mcp-relationship.md` — MCP comparison and interop model
- `docs/protocol/task-lifecycle.md` — task state machine
- `docs/protocol/delivery.md` — delivery semantics, acknowledgement protocol, replay
- `docs/protocol/reliability.md` — retry policy, dead-letter, durability
- `docs/protocol/error-model.md` — standard error codes for task failure and delivery errors
- `docs/protocol/conformance.md` — conformance levels HARMOVELA-C0 through HARMOVELA-C3
- `docs/protocol/profiles.md` — delivery profile (HARMOVELA-C2, HARMOVELA-C3)
