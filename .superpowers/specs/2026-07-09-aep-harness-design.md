# AEP Harness Design

## Purpose

Define the project development harness for Axisrobo AEP using Superpowers, and define the first implementation target that the harness should drive: a minimal AEP 0.1 conformance harness.

## Background

The repository currently contains the AEP vision, architecture, protocol design draft, MCP relationship, and roadmap. It does not yet have project-level agent rules, Superpowers work artifacts, or a concrete execution plan for turning the protocol draft into testable implementation work.

## Goals

- Enable Superpowers for OpenCode through project configuration.
- Provide aligned project instructions for OpenCode and Claude Code.
- Establish `docs/superpowers/specs/` and `docs/superpowers/plans/` as the location for durable agent work artifacts.
- Define the first implementable AEP harness target without prematurely committing to a production transport or broker.

## Non-Goals

- Do not copy the full Superpowers runtime into this repository.
- Do not finalize AEP 0.1 protocol semantics.
- Do not introduce a production message broker, database, or distributed runtime.
- Do not add backward-compatibility layers for behavior that has not shipped.

## Project Harness

The project harness consists of:

- `opencode.json` enabling the `superpowers` plugin.
- `AGENTS.md` for OpenCode project guidance.
- `CLAUDE.md` for Claude Code project guidance.
- `docs/superpowers/specs/` for design specs.
- `docs/superpowers/plans/` for executable plans.

This keeps Superpowers as the development workflow layer while leaving AEP itself implementation-neutral.

## First Implementation Target

The first AEP implementation target should be a minimal local conformance harness, not a full reference server.

It should provide:

- Envelope validation for the required fields in `docs/protocol-design.md`.
- Event type validation against the standard event families listed in the draft.
- Subscription matching for type patterns, source, target, topic, session, conversation, task, and cursor metadata.
- A stdio transport harness that reads newline-delimited JSON events and writes newline-delimited JSON responses/events.
- Deterministic fixtures for async task lifecycle, memory update, context invalidation, and acknowledgement flows.
- A small test suite that can run locally without external services.

## Repository Structure

Reference implementations live under `implementations/<language>/` so the repository can support multiple runtimes without mixing package managers or build systems at the root.

Shared protocol assets live outside language implementations:

- `schemas/`: draft JSON Schema assets for envelope and subscription validation.
- `conformance/fixtures/`: shared newline-delimited JSON streams for cross-language parity tests.

Language priority:

- `implementations/typescript/`: primary runnable reference harness.
- `implementations/python/`: second-priority implementation for agent runtimes and tooling.
- `implementations/go/`: later implementation for static binaries and infrastructure integrations.
- `implementations/java/`: later implementation for JVM and enterprise runtimes.

The root directory should remain focused on protocol documents, shared project configuration, CI, and harness workflow artifacts.

## Implementation Choice

The initial harness is a zero-dependency Node ESM package under `implementations/typescript/`. This keeps the draft runnable without adding a build step. The validation and registry modules are intentionally small so they can later be replaced or augmented by JSON Schema and generated TypeScript types.

## Acceptance Criteria

- Superpowers is enabled for the project through `opencode.json`.
- OpenCode and Claude Code have aligned project rules.
- The repository contains at least one Superpowers design spec and one executable plan.
- Future implementation work can start from the plan without re-discovering project scope or protocol boundaries.
- The local TypeScript harness can be verified with `cd implementations/typescript && npm test`.
- TypeScript tests validate the shared conformance fixtures from `conformance/fixtures/`.
