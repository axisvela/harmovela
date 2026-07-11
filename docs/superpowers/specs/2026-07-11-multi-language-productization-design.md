# Multi-Language Productization Design: Python, Go, Java

Date: 2026-07-11
Status: approved for implementation planning

## Goal

Bring Python, Go, and Java reference implementations to core productization parity with TypeScript: a config loader, a runtime service, an `aepd` daemon, an `aep` CLI, and an HTTP API for read and ingest. All three languages advance in the same round.

## Baseline

TypeScript already has: config, `AepRuntimeService`, HTTP api-server, `aepd` daemon, commander CLI, and HTTP subscriptions with SSE/long-poll. This design ports the core of that shape to the other three languages.

## Scope

### In Scope (per language)

1. Config module: default config, load config from file, environment overrides, and a delivery-store factory.
2. Runtime service: compose envelope validation, event router, delivery store, and server transports; expose publish with subscriber fanout.
3. `aepd` daemon entrypoint: load config, start the runtime service, handle shutdown signals.
4. `aep` CLI: `init`, `start`, `status`, `emit`, `subscribe`, `dlq`, `conformance`.
5. HTTP API (read + ingest): `GET /healthz`, `POST /events`, `GET /dlq`, `GET /pending`, `GET /stats`. Base path `/aep/api`.
6. For Go and Java: extract standalone subscription-matching and task-lifecycle utilities out of the harness so the runtime service can compose them.

### Out Of Scope (this round)

- HTTP subscriptions CRUD, SSE stream, long-poll push (a later round, mirroring TypeScript subproject B).
- MCP bridge in Python, Go, Java.
- JSON Schema validation in Go and Java.
- Kafka, NATS, Redis production transports beyond current state.
- Publishing packages to registries.
- No changes to TypeScript.
- No protocol changes.

## Shared Conventions

These conventions apply to all three languages so behavior and config stay consistent with TypeScript.

### Config Shape

```json
{
  "aep_version": "0.1",
  "runtime": { "id": "aepd-local", "source": "runtime:aepd" },
  "transports": {
    "websocket": { "enabled": true, "host": "127.0.0.1", "port": 8787, "path": "/aep" },
    "sse": { "enabled": true, "host": "127.0.0.1", "port": 8788, "path": "/aep/events" },
    "api": { "enabled": true, "host": "127.0.0.1", "port": 8790, "path": "/aep/api" },
    "stdio": { "enabled": false }
  },
  "delivery": {
    "store": "sqlite",
    "sqlite": { "path": ".aep/aep.sqlite" },
    "postgres": { "url": "postgres://postgres:postgres@localhost:5433/postgres" }
  }
}
```

Environment overrides: `AEP_CONFIG` (path), `AEPD_HOST`, `AEPD_WS_PORT`, `AEPD_SSE_PORT`, `AEPD_API_PORT`, `AEP_POSTGRES_URL`.

### HTTP API Endpoints

Base path from `transports.api.path`, default `/aep/api`.

- `GET {base}/healthz` -> `{ status, runtime, delivery }`.
- `POST {base}/events` -> validate then publish; 202 `{ accepted: true, id }`, 400 on invalid or malformed JSON with `{ accepted: false, errors }`.
- `GET {base}/dlq` -> `{ deadLettered, records }`.
- `GET {base}/pending` -> `{ pending, records }`.
- `GET {base}/stats` -> delivery stats object.
- Unknown route -> 404 `{ error: "not found" }`.

### CLI Commands

- `aep init [--config path]` writes default config.
- `aep start [--config path]` starts the daemon.
- `aep status [--url healthUrl]` fetches the api health endpoint and prints JSON; default `http://127.0.0.1:8790/aep/api/healthz`.
- `aep emit <type> [--payload json] [--url wsUrl]` publishes one event over WebSocket.
- `aep subscribe [--type pattern] [--url wsUrl]` prints matching events.
- `aep dlq list [--config path]` prints `{ deadLettered, records }` from the configured store.
- `aep conformance [--level level]` runs the conformance runner.

The `aepd` daemon is a separate entrypoint; `aep start` is a convenience wrapper.

## Per-Language Plan Split

Each language is its own implementation plan and its own set of batched commits. The three plans share this design.

### Python (`reference/python`)

- Dependencies: `click` for CLI; `http.server` (stdlib) for the API server; existing `websockets` for the WebSocket server transport.
- New modules under `src/aep/runtime/`: `config.py`, `service.py`, `api_server.py`, `server.py` (daemon).
- New package `src/aep/cli/` with a `click` group and command modules.
- `pyproject.toml` gains `[project.scripts]` entries `aep` and `aepd`, and a `click` dependency.
- Reuses existing `subscription.py` and `task.py` directly.
- Tests with `pytest`, spawning the CLI and daemon as subprocesses; API tested with `urllib`/`http.client` or a small client helper.

### Go (`reference/go`)

- Dependencies: `spf13/cobra` for CLI; stdlib `net/http` for the API server.
- First extract standalone `Subscription` matching into `aep/subscription.go` and task lifecycle into `aep/task.go` (moved out of `harness.go`, keeping harness behavior).
- New `aep/runtime.go` (or `aep/runtime/` package) for config, service, and HTTP api.
- New `cmd/aepd/main.go` and `cmd/aep/main.go` binaries.
- `go.mod` adds cobra.
- Tests with `go test ./...`, including cmd packages where practical and runtime service HTTP tests.

### Java (`reference/java`)

- Dependencies: `info.picocli:picocli` for CLI; JDK `com.sun.net.httpserver.HttpServer` for the API server.
- First extract standalone subscription matching into `Subscriptions.java` and task lifecycle into `TaskTracker.java` (moved out of `Harness`).
- New package `com.axisrobo.aep.runtime` with `Config`, `AepRuntimeService`, `ApiServer`, and a daemon main class `Aepd`.
- New `com.axisrobo.aep.cli.AepCli` picocli entrypoint.
- `pom.xml` adds picocli and an exec/shade configuration to run the CLI and daemon main classes.
- Tests with `mvn test` (JUnit Jupiter), spawning processes or invoking main methods, and HTTP api tests via `java.net.http.HttpClient`.

## Data Flow (all languages)

```text
client/CLI -> transport (WebSocket or HTTP api) -> runtime service -> validate -> router dispatch + store track -> subscribers/transports
```

The runtime service owns wiring only. It is not an agent framework.

## Error Handling

- Config load errors report the path and the invalid field.
- CLI JSON payload parse errors print a concise message and exit non-zero.
- Daemon startup fails fast if a configured store or transport port cannot initialize.
- HTTP `POST /events` maps validation failures to 400 with an error list.
- `aep subscribe` handles disconnect and Ctrl+C cleanly.

## Testing Strategy

Each language must keep its existing suite green and add:

- Config default/load/env-override tests.
- Runtime service publish-to-subscriber test with in-memory store.
- HTTP api healthz, events ingest, dlq, pending, stats tests.
- CLI init writes config; CLI emit/subscribe round-trip through a daemon; CLI conformance runs.
- Postgres-backed paths follow each language's existing live-DB test convention.

## Success Criteria

- Python, Go, and Java each expose a runnable `aepd` daemon and an `aep` CLI.
- Each language serves the HTTP read+ingest API at `/aep/api`.
- A user can `init`, `start`, `emit`, and `subscribe` in every language.
- All four languages remain green in their test suites.
- HTTP subscriptions and push remain a documented next round.
