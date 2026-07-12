# AEP SDK, Daemon, And CLI Productization Design

Date: 2026-07-11
Status: approved for implementation planning

## Baseline

Tag `2.0` marks the completed reference-implementation baseline:

- Four language references: TypeScript, Python, Go, Java.
- Core protocol model: envelope, router, session, subscription, task lifecycle, error model, delivery/reliability.
- Transport bindings: stdio, WebSocket, SSE, gRPC, NATS, Kafka, Redis Streams.
- Delivery stores: in-memory, SQLite, PostgreSQL.
- Cross-language conformance through AEP-C3.

After `2.0`, the project enters a productization track. The goal is to make AEP usable without reading reference code, while keeping the protocol draft small and implementation-neutral.

## Product Direction

Adopt option C: **SDK + `aepd` + CLI**.

This gives three usage modes:

- Agent runtime developers embed the SDK.
- App developers use a CLI and local/runtime service.
- Ops/platform teams can deploy the runtime daemon when AEP needs to be shared across processes.

The productization layer remains protocol-first. It does not become an agent framework, workflow engine, LLM runtime, or UI product.

## Target Users

Priority order:

1. **Agent runtime developers** need an embeddable AEP event layer: validation, routing, subscriptions, delivery, replay, transports, and MCP bridge helpers.
2. **App developers** need a direct path to try and use AEP without writing glue code: initialize config, run a service, emit events, subscribe, inspect dead letters.
3. **Ops/platform teams** need a daemon shape that can eventually be deployed with explicit storage and transport configuration.

Protocol implementers remain served by the reference implementations and conformance harnesses, but they are not the first productization target.

## Scope

### In Scope

- TypeScript-first SDK packaging under `implementations/typescript`.
- A runnable `aepd` daemon/runtime service.
- An `aep` CLI for local use and debugging.
- Configuration file generation and loading.
- Runtime composition from existing pieces: router, delivery tracker, stores, transport adapters, schema validation, conformance CLI.
- Memory, SQLite, and PostgreSQL store selection.
- stdio, WebSocket, and SSE as the first daemon-facing transports.
- Documentation and examples showing SDK usage and service usage.

### Out Of Scope

- No management UI.
- No Kubernetes operator or deployment chart.
- No auth control plane or multi-tenant admin service.
- No workflow engine.
- No agent abstraction layer such as `Agent`, `Tool`, `Memory`, or planner APIs.
- No protocol version stabilization work.
- No Python/Go/Java daemon parity in the first productization phase.

Python, Go, and Java continue as SDK/implementations/conformance implementations. They may later grow CLI or daemon support if the TypeScript shape proves useful.

## Architecture

Keep the first phase inside `implementations/typescript` to avoid a large monorepo restructure while the protocol is still draft.

Planned structure:

```text
implementations/typescript/
  src/
    index.js
    runtime/
      config.js
      service.js
      server.js
    cli/
      aep.js
      commands/
        init.js
        start.js
        emit.js
        subscribe.js
        dlq.js
        conformance.js
  examples/
    runtime-service/
```

### SDK Layer

The SDK is the public import surface for embedders. It re-exports existing primitives and adds a small composition API.

Primary exports:

- Envelope validation and schema helpers.
- Event router and subscription helpers.
- Delivery tracker, delivery journal, and delivery stores.
- Transport adapters.
- Runtime service factory.
- MCP bridge helpers.

The SDK should stay low-level. It should not introduce an agent framework API.

### Runtime Service (`aepd`)

`aepd` is a daemon that composes existing AEP primitives:

```text
transport ingress -> validate envelope -> route event -> delivery tracking -> subscribers/transports
```

It owns runtime wiring, not business behavior. It can:

- Start selected transports.
- Accept events from clients.
- Route events through `EventRouter`.
- Track delivery with selected store backend.
- Serve replay/pending/dead-letter inspection endpoints where supported by existing stores.

First daemon transports:

- WebSocket for bidirectional runtime clients.
- SSE for browser/server-to-client subscriptions.
- stdio for local process integration.

### CLI (`aep`)

The CLI wraps common developer workflows:

- `aep init` creates `aep.config.json`.
- `aep start` starts the daemon using the config.
- `aep emit <type> --payload <json>` publishes one event.
- `aep subscribe --type <pattern>` subscribes and prints events as NDJSON.
- `aep dlq list` lists dead-lettered events where the configured store supports it.
- `aep conformance` runs the existing conformance CLI.

`aepd` is the explicit daemon binary. `aep start` is a convenience alias for local development.

## Configuration

Default generated config:

```json
{
  "aep_version": "0.1",
  "runtime": {
    "id": "aepd-local",
    "source": "runtime:aepd"
  },
  "transports": {
    "websocket": { "enabled": true, "host": "127.0.0.1", "port": 8787 },
    "sse": { "enabled": true, "host": "127.0.0.1", "port": 8788 },
    "stdio": { "enabled": false }
  },
  "delivery": {
    "store": "sqlite",
    "sqlite": { "path": ".aep/aep.sqlite" },
    "postgres": { "url": "postgres://postgres:postgres@localhost:5433/postgres" }
  }
}
```

Environment overrides:

- `AEP_CONFIG` for config file path.
- `AEP_POSTGRES_URL` for PostgreSQL store URL.
- `AEPD_HOST`, `AEPD_WS_PORT`, and `AEPD_SSE_PORT` for local daemon binding.

## CLI Package Shape

`implementations/typescript/package.json` should expose binaries:

```json
{
  "bin": {
    "aep": "src/cli/aep.js",
    "aepd": "src/runtime/server.js"
  }
}
```

The package name can remain the current reference package during the first implementation pass. A later packaging pass can rename or publish as `@axisrobo/aep` once the public surface is stable enough.

## Data Flow

### Embedded SDK

```text
agent runtime code -> SDK runtime service/router -> transport/store -> subscribers
```

The runtime developer owns process lifecycle and calls SDK APIs directly.

### Daemon Mode

```text
client/agent/app -> WebSocket/SSE/stdio -> aepd -> router + delivery store -> subscribers
```

The daemon owns process lifecycle and configuration. Clients interact through transport protocols or the CLI.

### CLI Mode

```text
aep emit/subscribe/dlq -> local daemon endpoint -> aepd runtime internals
```

The CLI should not duplicate routing/delivery logic. It should use daemon endpoints or existing conformance/runtime modules.

## Error Handling

- Config loading errors should include file path and invalid field.
- CLI JSON payload parse errors should print a concise message and exit non-zero.
- Daemon startup should fail fast if configured stores or transport ports cannot initialize.
- Runtime event validation failures should emit/return an AEP error payload when invoked through runtime transports.
- `aep subscribe` should handle disconnects cleanly and exit on Ctrl+C.

## Testing

Tests should cover:

- Config default generation and loading.
- CLI command argument parsing for `init`, `emit`, `subscribe`, `dlq`, and `conformance`.
- Runtime service construction with memory and SQLite stores.
- WebSocket/SSE local roundtrip at the service level.
- CLI `emit` to daemon and `subscribe` from daemon for one event.
- Existing TypeScript suite remains green.

PostgreSQL-backed daemon tests can be optional or isolated behind `AEP_POSTGRES_URL` unless explicitly required later. The first productization tests should not make all CLI/service tests depend on a live database.

## Migration Path

1. Keep `2.0` as the reference-complete baseline.
2. Add TypeScript SDK surface and runtime/CLI files under `implementations/typescript`.
3. Document local usage with examples.
4. Once stable, consider moving TypeScript productized artifacts to `packages/`:

```text
packages/
  aep-sdk-typescript/
  aep-runtime/
  aep-cli/
```

Do not perform that restructure in the first implementation. It is packaging work, not required to prove the product shape.

## Success Criteria

- A developer can run `aep init` then `aep start` and get a local AEP runtime.
- A second terminal can run `aep subscribe --type 'task.*'`.
- A third terminal can run `aep emit task.submitted --payload '{"task_id":"task_01"}'` and the subscriber receives a valid AEP event.
- An agent runtime developer can import SDK modules instead of reading example files to discover primitives.
- Existing conformance and reference tests continue to pass.
