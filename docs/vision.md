# Harmovela Vision

## One-Line Vision

Harmovela makes asynchronous coordination a first-class capability for autonomous systems.

## Problem

Modern agent systems are no longer simple request-response programs. They run background tasks, watch external environments, update memory, collaborate with other agents, receive delayed tool results, and react to context changes after the original prompt has moved on.

MCP standardizes how agents synchronously discover and call tools. That is necessary but incomplete. Agents also need a standard way to receive events, progress, state changes, memory updates, and deferred results.

Without such a protocol, every runtime invents its own pattern:

- Polling for task state
- Custom webhooks
- Tool-specific callbacks
- Ad hoc message queues
- Non-standard JSON events
- Prompt-level conventions that are not machine-verifiable

These approaches do not compose well across agent runtimes, tools, memory systems, and deployment environments.

## Vision

Harmovela should become the common asynchronous coordination layer for agentic systems.

An agent should be able to subscribe to a memory stream, launch a long-running tool task, receive progress events, observe external state changes, cancel work, replay missed events, and correlate all of this with a conversation or task without depending on one vendor's runtime.

## Core Use Cases

### Event Streams

Agents need to receive events from tools, environments, memory systems, orchestrators, and other agents.

Examples:

- A memory system emits `memory.fact.invalidated`.
- A browser observer emits `environment.page.changed`.
- A robotics sensor emits `environment.object.detected`.
- A workflow engine emits `task.blocked`.

### Async Tool Calls

Some tool calls are too slow or open-ended for synchronous RPC.

Examples:

- Web crawling
- Long research tasks
- Codebase indexing
- Video or audio processing
- Simulation
- Multi-step planning

Harmovela should represent these as tasks with accepted, progress, output, completed, failed, cancelled, and timed-out events.

### Context And Memory Events

Agents need to react when their context changes.

Examples:

- New relevant memory has been indexed.
- A previously trusted fact is invalidated.
- A constraint changes.
- A user preference is updated.
- A retrieved context bundle is ready.

### Agent-To-Agent Communication

Agents need to exchange messages without blocking each other.

Examples:

- A researcher agent publishes findings to a planner.
- A reviewer agent flags a risk.
- A worker agent asks for clarification.
- A coordinator cancels duplicate work.

## Goals

- Define a protocol-level coordination envelope suitable for autonomous systems.
- Provide standard event types for task lifecycle, tool feedback, context changes, memory updates, agent messages, and delegation.
- Support local and distributed runtimes.
- Support multiple transports without making the protocol depend on one broker.
- Preserve causality and correlation across conversations, tasks, tool calls, and events.
- Enable replay and recovery after disconnection.
- Keep the core small enough for easy implementation.

## Non-Goals

- Harmovela is not a replacement for MCP.
- Harmovela is not a new LLM inference API.
- Harmovela is not a general database API.
- Harmovela is not a mandatory message broker implementation.
- Harmovela does not define every domain-specific event schema.

## Design Principles

- **Protocol before platform**: define interoperable messages before choosing infrastructure.
- **MCP-compatible, not MCP-dependent**: integrate with MCP while remaining useful outside MCP.
- **Event-first**: asynchronous communication should not be modeled as fake synchronous calls.
- **Durability optional, semantics explicit**: transports may be ephemeral or durable, but delivery guarantees must be declared.
- **Causality matters**: every event should be traceable to a task, conversation, or triggering event when available.
- **Human-readable, machine-validatable**: JSON should be easy to inspect and schema-check.
- **Small core, extensible domains**: standardize the envelope and lifecycle events; allow domain-specific payloads.
