# AEP Conformance Levels Design

Date: 2026-07-09

## Goal

Define a small, testable conformance model for AEP 0.1 draft and add a shared fixture manifest that both TypeScript and Python references can execute.

This turns the repository from a collection of reference implementations into a protocol repository with observable compatibility targets.

## Non-Goals

- Do not finalize AEP as stable.
- Do not add public certification, badges, or governance process in this slice.
- Do not require any specific internal architecture for implementations.
- Do not start Go or Java reference implementations as part of this slice.
- Do not require durable production storage for conformance.

## Conformance Levels

The conformance spec will define three draft levels. Each level is cumulative.

### AEP-C0: Envelope And Schema

An implementation can parse AEP envelopes, validate required envelope fields, enforce protocol version rules, validate standard event type names, and validate shared JSON Schemas.

Required behavior:

- Accept valid envelopes from shared fixtures.
- Reject envelopes missing required fields.
- Reject unsupported protocol versions.
- Reject unknown or malformed standard event types.
- Validate `schemas/aep-envelope.schema.json` and `schemas/subscription-filter.schema.json` where applicable.

### AEP-C1: Session, Subscription, Task, Error

An implementation supports the core interactive protocol behavior required by local agent runtimes.

Required behavior:

- Process session open, ready, heartbeat, error, and close flows.
- Create and validate subscriptions using standard filter fields.
- Route events according to type, source, session, task, and metadata filters.
- Process task lifecycle transitions for accepted, started, progress, blocked, resumed, completed, failed, cancelled, and timed out states.
- Emit standard error payloads for invalid protocol actions.

### AEP-C2: Delivery And Reliability

An implementation supports observable delivery semantics for distributed or durable deployments.

Required behavior:

- Track delivery sequence and cursor state.
- Process acknowledgement and negative acknowledgement events.
- Apply retry policy metadata consistently.
- Move exhausted deliveries to dead-letter state.
- Expose replay behavior through fixture-observable event sequences.

## Shared Fixture Manifest

Add `conformance/manifest.json` as the source of truth for fixture metadata.

Each manifest entry describes:

- Fixture path.
- Required conformance level.
- Short description.
- Expected outcome, such as `accept_all`, `reject_some`, or `stateful_flow`.
- Optional tags, such as `schema`, `session`, `task`, `delivery`, or `security`.

The manifest should not encode language-specific test details. Language references translate manifest expectations into their local test harness behavior.

Each runner declares the maximum conformance level it is verifying in that run. A runner must execute all manifest entries at or below that target level and must ignore higher-level entries unless explicitly configured to verify them. For this slice, both TypeScript and Python should target AEP-C1. AEP-C2 is specified so reliability fixtures have a stable destination, but C2 pass/fail status is not required until a runner opts into C2.

## TypeScript Runner

Add a TypeScript conformance command under `reference/typescript`.

Expected command:

```sh
npm run conformance
```

The runner will:

- Read `../../conformance/manifest.json`.
- Load each listed NDJSON fixture.
- Execute manifest entries up to the runner target level, initially AEP-C1.
- Validate envelopes with existing runtime and JSON Schema validators.
- Execute stateful fixture flows through the existing harness where behavior is already implemented.
- Report per-fixture pass/fail output and fail the process on any mismatch.

The runner should be minimal and reuse existing modules rather than introducing a new framework.

## Python Runner

Python conformance should reuse pytest.

Expected command:

```sh
python -m pytest --tb=short -q
```

The Python test suite will:

- Read `../../conformance/manifest.json`.
- Parametrize tests by fixture entry.
- Execute manifest entries up to the runner target level, initially AEP-C1.
- Validate envelopes and schemas using existing Python modules.
- Exercise implemented stateful behavior for C1 fixtures.

For this slice, Python should pass the same required C0 and C1 fixture expectations as TypeScript.

## Documentation Updates

Add `docs/specs/conformance.md` with the draft conformance model.

Update:

- `README.md` document index and verification commands.
- `docs/roadmap.md` Phase 6 conformance item with the new spec and manifest.
- `reference/typescript/README.md` with the conformance command.

## Error Handling

Conformance failures should be explicit and fixture-scoped.

Runner output should identify:

- Fixture path.
- Conformance level.
- Failed expectation.
- Event index where applicable.
- Underlying validation or state transition error.

The runners should not hide failures behind snapshots or broad exception messages.

## Testing

Verification for this slice:

```sh
cd reference/typescript && npm test
cd reference/typescript && npm run conformance
cd reference/python && python -m pytest --tb=short -q
```

Existing demo commands remain smoke checks and are not part of conformance requirements.

## Open Decisions Resolved

- Conformance levels are draft and cumulative.
- Shared fixture metadata lives at `conformance/manifest.json` outside language implementations.
- TypeScript gets a first-class `npm run conformance` command.
- Python uses pytest parametrization instead of a separate CLI.
- Governance and public certification are deferred.
