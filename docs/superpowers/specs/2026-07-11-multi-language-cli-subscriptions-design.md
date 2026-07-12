# Multi-Language CLI Subscriptions Command Design

Date: 2026-07-11
Status: approved for implementation planning

## Goal

Add an `aep subscriptions` command group to all four language CLIs (TypeScript, Python, Go, Java). It exposes `create`, `list`, `delete`, and `stream` subcommands that call the existing runtime HTTP subscriptions API. All four languages advance in the same round, each as its own implementation plan.

## Baseline

The runtime HTTP API in every language already serves subscription endpoints under `transports.api.path` (default `/aep/api`):

- `POST /subscriptions` create
- `GET /subscriptions` list
- `GET /subscriptions/:id` get
- `DELETE /subscriptions/:id` delete
- `GET /subscriptions/:id/events` long-poll
- `GET /subscriptions/:id/stream` SSE

Each CLI already has commands like `init`, `start`, `status`, `emit`, `subscribe` (WebSocket), `dlq`, `conformance`. The new `subscriptions` group is HTTP-based and distinct from the existing WebSocket `subscribe`.

## Scope

### In Scope (per language)

An `aep subscriptions <subcommand>` command group:

- `create --filter <json>` — POST `/subscriptions` with `{ "filter": <json> }`; print the created record JSON.
- `list` — GET `/subscriptions`; print the JSON `{ "subscriptions": [...] }`.
- `delete <id>` — DELETE `/subscriptions/:id`; print `{ "deleted": true }` or a not-found message with non-zero exit.
- `stream <id>` — GET `/subscriptions/:id/stream`; print each received SSE `data:` line as it arrives until interrupted.

All subcommands accept `--base <url>` with default `http://127.0.0.1:8790/aep/api`.

### Out Of Scope

- No new runtime endpoints (all already exist).
- No changes to the WebSocket `subscribe` command.
- No auth.
- No protocol changes.

## Shared Conventions

### Base URL

Default base `http://127.0.0.1:8790/aep/api`, overridable with `--base`. Endpoints are `{base}/subscriptions`, `{base}/subscriptions/<id>`, `{base}/subscriptions/<id>/stream`.

### create

Input: `--filter <json>` (default `{}`). Body: `{ "filter": <parsed json> }`. On invalid JSON: print `invalid JSON filter` to stderr and exit non-zero. On success: print the response record JSON (which includes `id`, `filter`, `created_at`).

### list

Print the response JSON body verbatim (`{ "subscriptions": [...] }`).

### delete

On 200: print the response body (`{ "deleted": true }`). On 404: print `not found` to stderr and exit non-zero.

### stream

Open the SSE endpoint and print each `data: <json>` line's payload (the JSON after `data: `) as it arrives. Runs until the process is interrupted (Ctrl+C) or the connection closes. On connection failure: print a concise message suggesting the daemon may not be running, exit non-zero.

### Error Handling

- Connection errors: concise message, non-zero exit.
- Non-2xx (except delete 404 handled above): print status and body, non-zero exit.
- Malformed `--filter` JSON: `invalid JSON filter`, non-zero exit.

## Per-Language Notes

### TypeScript (`reference/typescript`)

- New `src/cli/commands/subscriptions.js` exporting a function that dispatches subcommands, or four small functions.
- Wire a `subscriptions` command with a subcommand argument in `src/cli/aep.js` using commander.
- Use `fetch` for create/list/delete; for stream, use `fetch` with a streamed body reader (mirror `examples/service/http-api-client.js` and the SSE client patterns already in the repo).

### Python (`reference/python`)

- New subcommands under the existing `click` group in `aep/cli/main.py`, as an `aep subscriptions` group with `create`/`list`/`delete`/`stream`.
- Use `urllib.request` for create/list/delete; for stream, read the SSE response line by line.

### Go (`reference/go`)

- New cobra command `subscriptions` in `cmd/aep/main.go` with subcommands `create`/`list`/`delete`/`stream`.
- Use `net/http` for all; for stream, read the response body with a `bufio.Scanner` and print `data:` lines.

### Java (`reference/java`)

- New picocli subcommands under a `subscriptions` command in `cli/AepCli.java`.
- Use `java.net.http.HttpClient`; for stream, use `HttpResponse.BodyHandlers.ofLines()` and print `data:` lines.

## Testing Strategy

Each language keeps its existing suite green and adds CLI tests that start a real in-process runtime with the HTTP API enabled on an ephemeral port, then invoke the CLI subcommands against `--base`:

- `subscriptions create --filter '{"types":"task.*"}'` returns a record with an id.
- `subscriptions list` shows the created subscription.
- `subscriptions delete <id>` returns deleted true; a second delete or get returns not found / non-zero.
- `subscriptions stream <id>` receives a published matching event (start a subscriber, publish through the runtime, assert the streamed line contains the event id). Where a full subprocess stream test is awkward, a shorter integration test that reads one SSE line is acceptable, mirroring existing SSE tests.

CLI tests may invoke the command entrypoint in-process (Python `click` runner, Go cobra `Execute` with args, Java `AepCli.run(args)`) or as a subprocess, consistent with each language's existing CLI test style.

## Success Criteria

- Every language CLI has `aep subscriptions create|list|delete|stream` hitting the HTTP API.
- create/list/delete round-trip against a running runtime; stream prints received events.
- All four language suites remain green.
