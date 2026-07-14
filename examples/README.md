# Harmovela Examples

Organized by scene. Each file is named with a language suffix.

For end-to-end integration scenarios demonstrating how the coordination dimensions work together, see [`docs/protocol/scenarios.md`](../docs/protocol/scenarios.md).

## Quickstart (`examples/quickstart/`)

Minimal in-process runtime: create a service, subscribe to events, publish one event, receive it.

**Scenario:** [Async Task Orchestration](../docs/protocol/scenarios.md#1-async-task-orchestration)

| File | Language | Run command |
|---|---|---|
| `runtime-embed.js` | TypeScript | `node examples/quickstart/runtime-embed.js` |
| `runtime-embed.py` | Python | `PYTHONPATH=implementations/python/src python examples/quickstart/runtime-embed.py` |
| `runtime-embed.go` | Go | `cd implementations/go && go run ../../examples/quickstart/runtime-embed.go` |
| `runtime-embed.java` | Java | `cd implementations/java && javac -cp . ../../examples/quickstart/runtime-embed.java` |

## Service Client (`examples/service-client/`)

Connect to a running `harmovelad` over its HTTP API or WebSocket.

**Scenario:** [Async Task Orchestration](../docs/protocol/scenarios.md#1-async-task-orchestration)

| File | Language | Description |
|---|---|---|
| `emit-subscribe.js` | TypeScript | WebSocket: emit then subscribe, print received event |
| `http-subscribe.js` | TypeScript | HTTP: create subscription, emit event, long-poll/receive |

Start `harmovelad` first:
```bash
npm run harmovelad
```

## MCP Bridge (`examples/mcp-bridge/`)

Embed `McpBridge` with an async tool handler. Call the tool and observe Harmovela task lifecycle events.

**Scenario:** [MCP Bridge with Async Feedback](../docs/protocol/scenarios.md#3-mcp-bridge-with-async-feedback)

| File | Language | Run command |
|---|---|---|
| `async-tool.js` | TypeScript | `node examples/mcp-bridge/async-tool.js` |
| `async-tool.py` | Python | `PYTHONPATH=implementations/python/src python examples/mcp-bridge/async-tool.py` |
| `async-tool.go` | Go | `cd implementations/go && go run ../../examples/mcp-bridge/async-tool.go` |
| `async-tool.java` | Java | Compile and run from `implementations/java/` with classpath |

## Scenarios (`examples/scenarios/`)

End-to-end domain patterns.

**Scenario:** [Context and Memory Coordination](../docs/protocol/scenarios.md#2-context-and-memory-coordination)

| File | Language | Description |
|---|---|---|
| `agent-subscriber.js` | TypeScript | Agent subscribes to memory + context events |
| `memory-producer.js` | TypeScript | Memory system produces fact/retrieval/preference events |

## Prerequisites

- TypeScript: `npm install` at repo root (establishes workspace links for `@axisrobo/harmovela-*` packages).
- Python: `pip install -e implementations/python/` or set `PYTHONPATH=implementations/python/src`.
- Go: compile from the module root (`implementations/go/`).
- Java: compile with Maven classpath from `implementations/java/`.
