# AEP Commander CLI Design

Date: 2026-07-11
Status: approved for implementation planning

## Goal

Replace the hand-written `aep` CLI dispatcher with a `commander`-based command tree, while preserving existing command behavior and improving help, option parsing, and status inspection.

## Context

The TypeScript productization track introduced:

- `aepd` runtime daemon.
- `aep` CLI with `init`, `start`, `emit`, `subscribe`, `dlq`, and `conformance`.
- Runtime config and `AepRuntimeService`.
- HTTP health/status support in the runtime service.

The current CLI uses a hand-written dispatcher in `implementations/typescript/src/cli/aep.js`. That is sufficient for early testing, but it does not provide polished command help, consistent option parsing, or structured command definitions.

## Decision

Use `commander` for the TypeScript CLI.

Rationale:

- Fits the current command shape: `aep <command> [options]`.
- Lightweight compared to `oclif`.
- More structured than maintaining custom parsing.
- Works cleanly with the existing Node.js ESM setup.

## Scope

### In Scope

- Add `commander` dependency to `implementations/typescript`.
- Refactor `src/cli/aep.js` into a commander program.
- Keep command modules under `src/cli/commands/`.
- Convert command modules from raw `args` parsing to typed options where useful.
- Add `aep status --url <health-url>`.
- Update `aep init` default config to include `transports.status` enabled by default.
- Preserve existing commands:
  - `aep init --config aep.config.json`
  - `aep start --config aep.config.json`
  - `aep emit task.submitted --payload '{"task_id":"task_01"}' --url ws://127.0.0.1:8787/aep`
  - `aep subscribe --type 'task.*' --url ws://127.0.0.1:8787/aep`
  - `aep dlq list --config aep.config.json`
  - `aep conformance --level AEP-C0`
  - `aep conformance --level=AEP-C0` for backward compatibility.

### Out Of Scope

- No runtime HTTP ingest API.
- No auth.
- No plugin system.
- No interactive TUI.
- No package publishing workflow.
- No changes to Python, Go, or Java CLIs.
- No protocol-version stabilization.

## Command Shape

```bash
aep --help
aep init --config aep.config.json
aep start --config aep.config.json
aep status --url http://127.0.0.1:8789/healthz
aep emit task.submitted --payload '{"task_id":"task_01"}' --url ws://127.0.0.1:8787/aep
aep subscribe --type 'task.*' --url ws://127.0.0.1:8787/aep
aep dlq list --config aep.config.json
aep conformance --level AEP-C0
```

## Module Shape

```text
implementations/typescript/src/cli/
  aep.js
  commands/
    init.js
    start.js
    status.js
    emit.js
    subscribe.js
    dlq.js
    conformance.js
```

Command modules should expose functions that receive structured inputs:

```javascript
initCommand({ config })
startCommand({ config })
statusCommand({ url })
emitCommand(type, { payload, url, id, source })
subscribeCommand({ type, url })
dlqListCommand({ config })
conformanceCommand({ level })
```

The CLI entrypoint owns commander setup. Command modules own behavior.

## Default Config Change

`defaultConfig()` should include a status transport:

```json
"status": {
  "enabled": true,
  "host": "127.0.0.1",
  "port": 8789,
  "path": "/healthz"
}
```

This makes `aep status` usable immediately after `aep init` and `aep start`.

## Status Command

`aep status` requests the runtime health endpoint and prints the JSON response.

Default URL:

```text
http://127.0.0.1:8789/healthz
```

The command exits non-zero if the daemon is unreachable or returns a non-2xx response.

## Error Handling

- Commander handles missing required command arguments, such as `aep emit` without a type.
- Payload JSON parsing remains inside `emitCommand`, so invalid payloads return `invalid JSON payload`.
- Connection failures should return concise messages and non-zero exit codes.
- Help output should list all top-level commands.

## Testing

Tests should cover:

- `aep --help` lists core commands.
- `aep emit` without event type exits non-zero.
- `aep emit task.submitted --payload '{'` exits non-zero with `invalid JSON payload`.
- `aep conformance --level AEP-C0` works.
- `aep conformance --level=AEP-C0` remains compatible.
- `aep status --url <test-server>` prints JSON status.
- `aep init` writes config containing `transports.status`.

Existing runtime e2e tests for `emit` and `subscribe` must continue to pass.

## Success Criteria

- CLI behavior is command-framework based, not hand-dispatched.
- Existing CLI commands remain compatible.
- `aep --help` is useful enough for a new user to discover commands.
- `aep status` works against `aepd` health endpoint.
- TypeScript test suite remains green.
