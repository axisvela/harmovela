# MCP+AEP Consumer Example Design

Date: 2026-07-09

## Goal

Add a TypeScript example that demonstrates an agent using MCP for immediate tool invocation while consuming AEP events for asynchronous task lifecycle updates.

This completes the Phase 4 roadmap gap: "Example agent consuming both MCP and AEP."

## Non-Goals

- Do not add new AEP protocol semantics.
- Do not add a reusable public consumer abstraction yet.
- Do not introduce a real MCP transport or network server for this example.
- Do not change the existing MCP bridge behavior except where tests reveal an existing correctness bug.
- Do not expand this slice into Go, Java, or Python examples.

## Approach

Use a single scripted TypeScript example backed by a small testable helper module.

The example should show the protocol relationship clearly:

- MCP returns an immediate `task_id` from `tools/call`.
- AEP later emits task lifecycle events for that same `task_id`.
- The consumer correlates lifecycle events by `task_id` and presents them as one logical operation.

This keeps the example easy to run and avoids defining a premature consumer SDK.

## Components

### Consumer Helper

Create a focused module under `reference/typescript/src/bridge/` that drives the existing `McpBridge` directly.

Responsibilities:

- Send JSON-RPC-style MCP requests to the existing bridge object.
- Parse `tools/call` responses and extract `task_id` values.
- Observe AEP events emitted by the bridge.
- Group observed events by `task_id`.
- Produce a deterministic summary suitable for tests and demo output.

The helper should not know about transports. It demonstrates protocol flow, not stdio/WebSocket mechanics.

### Demo Script

Add `reference/typescript/examples/mcp-aep-consumer.js`.

The script should:

- Print a short title.
- Initialize the bridge.
- List available MCP tools.
- Call one or two demo tools.
- Print immediate MCP task responses.
- Wait for AEP lifecycle events emitted by the bridge.
- Print correlated task timelines.

The transcript should make the lesson obvious: MCP initiated work synchronously, AEP carried asynchronous progress and completion.

### Package Script

Add:

```sh
npm run demo:mcp-aep-consumer
```

The existing `demo:mcp-bridge` remains unchanged.

## Data Flow

1. Consumer sends `initialize` to `McpBridge`.
2. Consumer sends `tools/list` and records available tool names.
3. Consumer sends one or more `tools/call` requests.
4. Bridge returns immediate MCP responses containing serialized JSON with `task_id` and `status`.
5. Bridge emits AEP task events asynchronously.
6. Consumer groups events by `task_id` and records event type order.
7. Demo prints the immediate MCP result first, then the AEP timeline.

## Error Handling

The helper should fail clearly when:

- An MCP response has an `error` field.
- A `tools/call` response does not contain parseable JSON text.
- A parsed MCP tool result does not contain `task_id`.
- A task does not receive a terminal AEP event before the demo timeout.

Errors should include enough context to identify the failing MCP method, tool name, or task ID.

## Testing

Add a focused Node test under `reference/typescript/test/`.

The test should verify:

- The consumer initializes the bridge and lists tools.
- Tool calls return task IDs immediately.
- AEP events are grouped by task ID.
- Each called task receives `task.accepted`, `task.started`, at least one `task.progress`, and `task.completed`.

Verification commands:

```sh
cd reference/typescript && npm test
cd reference/typescript && npm run demo:mcp-aep-consumer
cd reference/typescript && npm run conformance
```

The demo command is a smoke check. `npm test` carries the behavioral assertions.

## Documentation Updates

Update:

- `README.md` example command list.
- `reference/typescript/README.md` example command list and current scope.
- `docs/roadmap.md` Phase 4 deliverable to point to the new example file.

## Open Decisions Resolved

- This slice uses a single TypeScript example plus a testable internal helper.
- The example is transport-free and drives `McpBridge` directly.
- No reusable public SDK abstraction is introduced.
- The example demonstrates correlation by `task_id`, not by introducing new correlation rules.
