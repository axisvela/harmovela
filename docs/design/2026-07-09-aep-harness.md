# AEP Harness Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Goal

Enable Superpowers as the project development harness and prepare the first implementation path for a minimal AEP 0.1 conformance harness.

## Spec

Implements `docs/superpowers/specs/2026-07-09-aep-harness-design.md`.

## Steps

- [x] Add `opencode.json` with the Superpowers plugin enabled.
- [x] Add `AGENTS.md` with OpenCode project instructions.
- [x] Add `CLAUDE.md` with aligned Claude Code project instructions.
- [x] Add the Superpowers harness design spec.
- [x] Add this execution plan under `docs/superpowers/plans/`.
- [x] Implement the minimal AEP 0.1 conformance harness.
- [x] Add schema or runtime validation for required envelope fields.
- [x] Add event type registry validation for standard event families.
- [x] Add subscription matching tests for type patterns and routing metadata.
- [x] Add stdio newline-delimited JSON fixtures for task, memory, context, and ack flows.
- [x] Document the harness command and expected input/output format.
- [x] Move the runnable harness under `implementations/typescript/` for multi-language repository structure.
- [x] Add placeholders for Python, Go, and Java reference implementations.
- [x] Update CI to run the TypeScript reference harness tests from `implementations/typescript/`.
- [x] Add shared conformance fixtures under `conformance/fixtures/`.
- [x] Add draft JSON Schema assets under `schemas/`.
- [x] Update TypeScript tests to validate shared conformance fixtures.
- [x] Add session lifecycle module (opened/ready/heartbeat/closed/error state machine).
- [x] Add task lifecycle tracker with valid state transitions.
- [x] Add protocol error model with standard error codes.
- [x] Add event router with type-pattern dispatch.
- [x] Add session flow conformance fixture.
- [x] Write session lifecycle specification (`docs/specs/session.md`).
- [x] Write subscription model specification (`docs/specs/subscription.md`).
- [x] Write task lifecycle specification (`docs/specs/task-lifecycle.md`).
- [x] Write error model specification (`docs/specs/error-model.md`).
- [x] Write versioning rules specification (`docs/specs/versioning.md`).
- [x] Update README, roadmap, AGENTS.md, CLAUDE.md with new spec references.
- [x] Write stdio transport specification (`docs/specs/transport-stdio.md`).
- [x] Write WebSocket transport specification (`docs/specs/transport-websocket.md`).
- [x] Write HTTP SSE transport specification (`docs/specs/transport-sse.md`).
- [x] Implement Transport base class and StdioTransport (`src/transport/`).
- [x] Implement WebSocket transport with server and client.
- [x] Implement HTTP SSE transport with server and client.
- [x] Add transport-level tests (12 tests, 51 total).
- [x] Run full suite verification: 51 pass, clean exit.
- [x] Implement MCP bridge module (`src/bridge/mcp-bridge.js`).
- [x] Implement MCP JSON-RPC stdio transport (`src/bridge/stdio.js`).
- [x] Build MCP bridge demo (`examples/mcp-bridge/demo.js`).
- [x] Add MCP bridge tests (5 tests, 56 total).
- [x] Update roadmap Phase 4 with MCP bridge links.
- [x] Create Python reference implementation (envelope, session, task, router, harness, 39 tests).
- [x] Add JSON Schema validation (ajv for TS, jsonschema for Python, 12 schema tests).
- [x] Write delivery semantics specification (`docs/specs/delivery.md`).
- [x] Write reliability specification (`docs/specs/reliability.md`).
- [x] Implement DeliveryTracker with sequence, ack, retry, dead-letter (8 delivery tests).
- [x] Write security model specification (`docs/specs/security.md`).

## Verification

- Documentation harness changes: inspect links and file references.
- TypeScript implementation harness changes: run `cd implementations/typescript && npm test`.
- Stdio fixture verification: run `cd implementations/typescript && npm run harness < ../../conformance/fixtures/task-lifecycle.ndjson`.
