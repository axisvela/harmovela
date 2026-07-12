# Top-Level Examples And SDK Package Rename Design

Date: 2026-07-11
Status: approved for implementation planning

## Goal

Promote examples from `implementations/typescript/examples/` to a top-level `examples/` directory that consumes AEP as a real user would: some examples embed the SDK by package name, others act as clients of a running `aepd` service. Rename the TypeScript reference package to `@axisrobo/aep` and wire a top-level npm workspace so package-name imports resolve locally without publishing.

## Context

Current examples live under `implementations/typescript/examples/` and import internal source with relative paths such as `../src/index.js`. That reads like reference internals, not consumer usage. The productization track (SDK + `aepd` + CLI + HTTP API) now makes a consumer-facing examples layer meaningful.

The reference package is currently `@axisrobo/aep-reference-typescript` with `private: true`. It is not published.

## Decisions

- Rename the TypeScript reference package to `@axisrobo/aep`.
- Keep `private: true`. Workspaces link locally; publishing stays disabled.
- Add a top-level `package.json` declaring an npm workspace that includes `implementations/typescript`.
- Create a top-level `examples/` directory with two categories:
  - `examples/sdk/` â€?embed the SDK via `import { ... } from "@axisrobo/aep"`.
  - `examples/service/` â€?connect to a running `aepd` over WebSocket and the HTTP API.
- Migrate existing reference examples that demonstrate SDK embedding into `examples/sdk/`, updating imports to the package name.
- Keep runnable reference-internal demos that are transport/harness specific where relative imports are clearer only if they do not fit the consumer model; otherwise migrate.

## Scope

### In Scope

- Rename package `name` to `@axisrobo/aep` in `implementations/typescript/package.json` and update `package-lock.json` name fields.
- Add top-level `package.json` with `workspaces: ["implementations/typescript"]` and no dependencies of its own.
- Add root `.gitignore` entry for root `node_modules` if not already ignored.
- Create `examples/sdk/` with SDK-embedding examples importing `@axisrobo/aep`.
- Create `examples/service/` with service-client examples using WebSocket and HTTP API.
- Migrate existing SDK-style examples from `implementations/typescript/examples/` to `examples/sdk/` with package-name imports.
- Update `implementations/typescript/package.json` demo scripts that referenced moved files, or remove scripts that no longer apply.
- Add `examples/README.md` describing both categories and how to run them.
- A smoke test or npm script that runs at least one sdk example and one service example headlessly.

### Out Of Scope

- No npm publish.
- No changes to Python, Go, or Java references.
- No protocol changes.
- No new runtime features.
- No CI changes beyond what is needed to run example smoke checks locally.

## Package Rename

`implementations/typescript/package.json`:

```json
{
  "name": "@axisrobo/aep",
  "private": true
}
```

`package-lock.json` top `name` and the root package `name` field update to `@axisrobo/aep`.

Existing `bin` entries `aep`, `aepd`, `aep-harness` and scripts remain. The rename does not change binary names.

## Workspace Layout

Top-level `package.json`:

```json
{
  "name": "aep-workspace",
  "private": true,
  "workspaces": ["implementations/typescript"]
}
```

After `npm install` at the repo root, npm links `@axisrobo/aep` into the root `node_modules`, so both root `examples/` and the reference package can import `@axisrobo/aep`.

Root `node_modules/` must be git-ignored.

## Examples Layout

```text
examples/
  README.md
  sdk/
    runtime-embed.js
    agent-subscriber.js
    memory-event-producer.js
  service/
    emit-and-subscribe.js
    http-api-client.js
```

### SDK Examples

Import by package name:

```javascript
import { AepRuntimeService, defaultConfig } from "@axisrobo/aep";
```

They construct a runtime service in-process and demonstrate publish/subscribe without any external server.

### Service Examples

They assume a running `aepd`. They connect over the WebSocket transport or the HTTP API:

- `emit-and-subscribe.js`: open a WebSocket subscriber, emit an event, print received event.
- `http-api-client.js`: create a subscription via `POST /aep/api/subscriptions`, publish via `POST /aep/api/events`, poll `GET /aep/api/subscriptions/:id/events`.

Service examples print clear instructions if the daemon is not reachable.

## Migration Of Existing Examples

Existing files under `implementations/typescript/examples/`:

- `agent-subscriber.js` â€?migrate to `examples/sdk/agent-subscriber.js`, import `@axisrobo/aep`.
- `memory-event-producer.js` â€?migrate to `examples/sdk/memory-event-producer.js`, import `@axisrobo/aep`.
- `async-tool-producer.js` â€?migrate to `examples/sdk/` if it only uses public exports; otherwise keep under reference and note as internal.
- `mcp-aep-consumer.js` and `mcp-bridge/demo.js` â€?migrate to `examples/sdk/` if they use only public exports; otherwise keep as reference internals.
- `production-e2e.js` â€?keep as a reference internal test harness; it is not a consumer example.
- `runtime-service/README.md` â€?fold into `examples/README.md`.

Any export used by a migrated example that is not currently in `src/index.js` must be added to `src/index.js` so the public package surface is sufficient. The design assumes migrated examples rely only on public exports; missing ones are added to `index.js`.

## Scripts

Root `package.json` scripts:

```json
{
  "scripts": {
    "test": "npm test --workspace @axisrobo/aep",
    "example:sdk": "node examples/sdk/runtime-embed.js"
  }
}
```

Reference package scripts referencing moved example files are updated or removed to avoid broken paths.

## Error Handling

- Service examples catch connection errors and print how to start `aepd`.
- SDK examples run fully in-process and require no external services.
- Root `npm install` establishes workspace links; documentation states this is required before running examples.

## Testing

- After rename and workspace setup, `npm test --workspace @axisrobo/aep` runs the full TypeScript suite and stays green.
- Add `test/examples-smoke.test.js` under `implementations/typescript/test/` that spawns one SDK example and asserts expected stdout, and spawns `aepd` plus one service example and asserts an event round-trips.
- The smoke test uses ephemeral ports and disables unused transports to avoid conflicts.

## Success Criteria

- A new user can read `examples/` and see both SDK-embed and service-client usage.
- SDK examples import `@axisrobo/aep` and run via the workspace link without publishing.
- Service examples exercise a running `aepd` over WebSocket and HTTP API.
- The TypeScript test suite remains green.
- No package is published; `private: true` remains.
