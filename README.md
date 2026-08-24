# Harmovela Protocol

> [中文文档 (Chinese)](README_zh.md) | [Spec Site](https://axisrobo.github.io/harmovela/)

**Harmovela Protocol** is an open coordination protocol for autonomous systems. It defines how agents, tools, memory systems, context providers, environment observers, and multi-agent runtimes coordinate across seven interdependent dimensions:

| Dimension | What Harmovela defines |
|---|---|
| Event | What happened — publish, subscribe, correlate, replay, acknowledge. |
| Task | What is executing — lifecycle from submitted through completed, failed, or cancelled. |
| State | What is true now — versioned state, freshness windows, invalidation, change propagation. |
| Context / Memory | What informs decisions — updates, invalidation, provenance, retrieval readiness. |
| Delegation | Who does what — assignment, acceptance, handoff, escalation, cancellation propagation. |
| Recovery | What to do when things break — idempotency, replay, checkpoints, interruption, compensation. |
| Governance | Who can do what — identity, authorization, audit, tenant isolation, policy integration. |

Harmovela complements MCP. MCP remains the synchronous capability invocation layer; Harmovela provides the asynchronous coordination layer — event streams, task lifecycle, state management, context awareness, delegation, recovery, and governance.

## About

The current 0.5 Adaptation Preview is a multi-language protocol repository with:

- **13 dimension modules** (Event, Task, State, Context/Memory, Delegation, Recovery, Governance, Tool, Agent, Environment, Adaptation, Command, Query)
- **5 infrastructure modules** (Harness, Runtime, CLI, Conformance, MCP Bridge)
- **17 protocol specifications** covering session, subscription, task, error, versioning, delivery, reliability, security, conformance, and transport layers
- **4 productized implementations** (TypeScript, Python, Go, Java) — each with runtime daemon, CLI, HTTP API, subscriptions, MCP bridge, and delivery stores
- **34 conformance fixtures** with cross-language validation
- **~700 tests** across four languages, all passing
- **7 transport bindings** (stdio, WebSocket, SSE, gRPC, NATS, Kafka, Redis Streams) implemented across all languages
- **SQLite and PostgreSQL delivery stores** with retry, dead-letter, replay, and cross-language conformance
- **Spec site** at [axisrobo.github.io/harmovela](https://axisrobo.github.io/harmovela/)

```mermaid
graph LR
    subgraph evt["Event Layer (L0)"]
        E["Envelope · Session · Subscription<br/>Routing · 7 Transport Bindings"]
    end
    subgraph coord["Coordination Layer (L1–L2)"]
        C["Task · State · Delegation<br/>Context/Memory · RBAC Governance<br/>Recovery · Tenant Isolation"]
    end
    subgraph adp["Adaptation Layer (L3)"]
        A["Feedback · Budget Enforcement<br/>Audit · Authorization · Profiles"]
    end
    evt --> coord --> adp
```

## Vision

Autonomous systems need more than synchronous tool calls. They need to sense, decide, act, recover, and coordinate continuously. Harmovela Protocol provides the open coordination layer for that continuous cycle.

Harmovela integrates three interwoven qualities:

- **Connection & Collaboration**: network effects across autonomous entities, collective intelligence that grows with participants, alignment across agents, tools, and runtimes.
- **Dynamic & Evolution**: continuous adaptation to changing environments, emergence of coordinated behavior, flow of context and state over time.
- **Order & Governance**: trust through verifiable boundaries, balance between autonomy and constraint, resilient coordination under uncertainty.

## Scope

Harmovela covers:

- **Event**: publish, subscribe, correlate, replay, acknowledge — the complete event lifecycle.
- **Task**: lifecycle from submitted through accepted, executing, progressing, completed, failed, or cancelled — with timeout, blockage, and output streaming.
- **State**: versioned state, freshness windows, invalidation, change propagation — what is true now.
- **Context / Memory**: updates, invalidation, provenance, retrieval readiness — what informs decisions.
- **Delegation**: assignment, acceptance, handoff, escalation, cancellation propagation — who does what.
- **Recovery**: idempotency, replay, checkpoints, interruption, compensation — what to do when things break.
- **Governance**: identity, authorization, audit, tenant isolation, policy integration — who can do what.

Harmovela does not replace:

- MCP synchronous tool invocation
- LLM completion APIs
- Vector database APIs
- Business-specific memory schemas
- General-purpose message brokers

## Relationship To MCP

| MCP | Harmovela |
| --- | --- |
| Synchronous request / response | Asynchronous coordination streams |
| Tool invocation | Task lifecycle and tool feedback |
| Resource reading | Context updates, state changes, invalidation |
| Client-driven calls | Producer-driven events |
| Immediate result | Deferred, incremental, replayable results |

Harmovela should interoperate with MCP rather than fork it. Harmovela can carry events about MCP tool calls, but it should remain protocol-independent enough to support non-MCP agents, tools, memory systems, robotics systems, browsers, IDEs, and cloud runtimes.


## Documents

### Core (English)

- `design/vision.md` -- project vision, goals, non-goals, and principles ([中文](design/zh/vision.md))
- `design/architecture.md` -- system architecture and major protocol layers ([中文](design/zh/architecture.md))
- `design/differentiation.md` -- non-normative positioning and comparison material
- `design/protocol-design.md` -- initial protocol model, envelope, events, and lifecycle ([中文](design/zh/protocol-design.md))
- `design/mcp-relationship.md` -- detailed comparison and interop model with MCP
- `design/roadmap.md` -- proposed phases toward a usable open protocol

### Protocol Specs (`design/protocol/`)

- `design/protocol/session.md` -- session lifecycle specification
- `design/protocol/subscription.md` -- subscription model specification
- `design/protocol/task-lifecycle.md` -- task lifecycle specification
- `design/protocol/error-model.md` -- error model specification
- `design/protocol/versioning.md` -- versioning rules specification
- `design/protocol/transport-stdio.md` -- stdio transport specification
- `design/protocol/transport-websocket.md` -- WebSocket transport specification
- `design/protocol/transport-sse.md` -- HTTP SSE transport specification
- `design/protocol/transport-grpc.md` -- gRPC streaming transport specification
- `design/protocol/transport-kafka.md` -- Kafka transport specification
- `design/protocol/transport-nats.md` -- NATS transport specification
- `design/protocol/transport-redis-streams.md` -- Redis Streams transport specification
- `design/protocol/delivery.md` -- delivery semantics, acknowledgement, and replay specification
- `design/protocol/reliability.md` -- retry, durability, and dead-letter handling specification
- `design/protocol/security.md` -- identity, authorization, audit, and tenant isolation specification
- `design/protocol/conformance.md` -- draft conformance levels and shared fixture manifest rules
- `design/protocol/event-registry-governance.md` -- event type registry governance and versioning
- `design/protocol/agent-runtime-semantics.md` -- belief, freshness, delegation, interruption, and provenance metadata
- `design/protocol/adaptation-budget.md` -- adaptation budget specification
- `design/protocol/adaptation-feedback.md` -- adaptation feedback specification
- `design/protocol/compatibility-matrix.md` -- migration compatibility matrix
- `design/protocol/event-contract.md` -- event contract boundary
- `design/protocol/event-dimension-classification.md` -- event type dimension classification
- `design/protocol/governance-contract.md` -- governance contract boundary
- `design/protocol/l1-policy-surface.md` -- L1 advisory policy surface
- `design/protocol/profiles.md` -- protocol profiles
- `design/protocol/scenarios.md` -- integration scenarios

### Design Documents (`design/design/`)

- `design/design/` -- Superpowers-backed design specs and implementation plans

### Conformance

- `CONFORMANCE.md` -- public conformance compliance matrix across all implementations

### Governance

- `GOVERNANCE.md` -- project governance and decision-making
- `RELEASES.md` -- release phases, versioning, and artifacts
- `TRADEMARKS.md` -- name and mark usage guidelines
- `LICENSE` -- Apache License 2.0

### Guides

- `CONTRIBUTING.md` -- contribution guide and repository conventions
- `CODE_OF_CONDUCT.md` -- contributor code of conduct


## Repository Layout

```mermaid
graph TB
    subgraph shared["Shared Assets"]
        direction LR
        SCHEMAS["JSON Schemas"] --- FIXTURES["28 Fixtures"]
        SPECS["27 Protocol Specs"] --- TOOLS["Conformance Runner"]
    end
    subgraph dim["11 Dimension Modules"]
        direction LR
        EVENT["Event"] --- RECOVERY["Recovery"]
        TASK["Task"] --- STATE["State"]
        CONTEXT["Context/Memory"] --- DELEGATION["Delegation"]
        GOVERNANCE["Governance"] --- TOOL["Tool"]
        AGENT["Agent"] --- ENV["Environment"]
        ADAPTATION["Adaptation"]
    end
    subgraph infra["5 Infrastructure Modules<br/><i>consumes dimension modules</i>"]
        direction LR
        HARNESS["Harness"] --> RUNTIME["Runtime/Daemon"]
        RUNTIME --> CLI["CLI"]
        HARNESS --> CONFORM["Conformance"]
        HARNESS --> MCP["MCP Bridge"]
    end
    shared --> dim --> infra
```

- `design/` -- protocol source documents: vision, architecture, design drafts, specifications, roadmap, translations
- `design/protocol/` -- per-layer protocol specifications (session, subscription, task lifecycle, error model, versioning, transports)
- `design/design/` -- Superpowers-backed design specs and implementation plans
- `design/zh/` -- Chinese translations of key documents
- `docs/` -- generated specification site (HTML), served by GitHub Pages
- `schemas/` -- shared draft JSON Schema assets
- `conformance/` -- shared fixtures for cross-language conformance
- `examples/` -- scene-based examples: quickstart, service-client, mcp-bridge, scenarios
- `implementations/` -- language-specific implementations
- `implementations/typescript/` -- TypeScript implementation (SDK, harmovelad daemon, harmovela CLI, HTTP API)
- `implementations/python/` -- Python implementation (SDK, daemon, CLI, HTTP API)
- `implementations/go/` -- Go implementation (SDK, daemon, CLI, HTTP API, sub-package layout)
- `implementations/java/` -- Java implementation (SDK, daemon, CLI, HTTP API, JDK 21)
- `.github/workflows/` -- repository CI
- `tools/` -- development tools (conformance runner, spec site generator)
- `.superpowers/` -- Superpowers-backed specs, plans, skills, and notes
- `.opencode/` -- OpenCode agent configuration

## Development Harness

This project uses Superpowers as its agent development harness. OpenCode loads it through `opencode.json`; durable specs and plans live under `.superpowers/`.

- `AGENTS.md` — OpenCode project rules
- `CLAUDE.md` — Claude Code project rules
- `.superpowers/specs/` — Superpowers-backed design specs
- `.superpowers/plans/` — Superpowers-backed execution plans

## Harmovela Harness

The repository includes a minimal local 0.1 draft conformance harness that uses newline-delimited JSON over stdio.

Run tests:

```sh
cd implementations/typescript && npm install
cd implementations/typescript && npm test
```

Run TypeScript conformance fixtures:

```sh
cd implementations/typescript && npm run conformance
```

Run cross-language conformance:

```sh
node tools/conformance-runner.js
```

This runs shared fixtures across all four language references and prints a unified pass/fail matrix.

Run the stdio harness:

```sh
cd implementations/typescript && npm run harness < ../../conformance/fixtures/task-lifecycle.ndjson
```

Run examples:

See `examples/` — organized by scene: quickstart, service-client, mcp-bridge, scenarios. Each file is language-suffixed.

```sh
# TypeScript quickstart
node examples/quickstart/runtime-embed.js

# Python quickstart
PYTHONPATH=implementations/python/src python examples/quickstart/runtime-embed.py

# Go quickstart (from the Go module root)
cd implementations/go && go run ../../examples/quickstart/runtime-embed.go

# MCP bridge
node examples/mcp-bridge/async-tool.js
```

## Spec Site

The rendered specification is published at **[https://axisrobo.github.io/harmovela/](https://axisrobo.github.io/harmovela/)**.

## Status

Harmovela is a draft open protocol with four active reference implementations (TypeScript, Python, Go, Java) maintaining cross-language parity. The repo includes layered specifications for session, subscription, task lifecycle, error model, versioning, conformance, delivery, reliability, security, event registry governance, and four transport bindings (stdio, WebSocket, SSE, gRPC). Each reference supports SQLite-backed delivery stores, and a cross-language conformance runner (`node tools/conformance-runner.js`) validates shared fixtures across all four languages.
