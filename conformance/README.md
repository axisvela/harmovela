# AEP Conformance Assets

This directory contains shared assets that every reference implementation should use.

## Layout

- `fixtures/` — newline-delimited JSON event streams for local harness and parser tests

## Fixtures

| File | Covers |
|------|--------|
| `task-lifecycle.ndjson` | Task submitted, progress, completed |
| `memory-context-ack.ndjson` | Subscription, memory, context, acknowledgement |
| `session-flow.ndjson` | Capabilities, session open/close, subscription |
| `delivery.ndjson` | Task lifecycle with delivery tracking, ack, redelivery, dead-letter |

## Rules

- Fixtures must use only protocol behavior documented in `docs/` or `schemas/`.
- Fixtures should be deterministic and small enough for language test suites to load directly.
- Language implementations should not maintain divergent copies of these fixtures.
- Each fixture should cover a single protocol flow end-to-end.
