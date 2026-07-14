# Harmovela Architecture

## Architectural Position

Harmovela sits beside MCP as an asynchronous coordination protocol for agentic systems.

```text
LLM Agent / Agent Runtime
        |
        | synchronous calls
        v
      MCP
        |
        | tools, resources, prompts

LLM Agent / Agent Runtime
        ^
        | asynchronous events
        v
   Harmovela
        |
        | tools, memory, context, environments, agents, orchestrators
```

MCP answers: "What can I call, and what is the result now?"

Harmovela answers: "What happened (Event), what work is in flight (Task), what is the current known truth (State), what informs decisions (Context/Memory), who is responsible (Delegation), how to handle failure (Recovery), and who may do what (Governance)."

## What Harmovela Adds

Generic event infrastructure already supplies envelopes, brokers, delivery mechanisms, and transport bindings. Harmovela does not replace those concerns. It adds a shared, agent-facing vocabulary spanning all 7 coordination dimensions:

- **Event** -- what changed, via typed, correlatable event envelopes
- **Task** -- work in flight, with full lifecycle from submission through completion, failure, or cancellation
- **State** -- the current known truth, carried as snapshot events and incremental deltas
- **Context / Memory** -- facts, episodes, preferences, and invalidation that inform agent decisions
- **Delegation** -- assignment of work across agents, with visibility into ownership and handoff
- **Recovery** -- retry, dead-letter, replay, and durability primitives for resilience
- **Governance** -- identity, authorization, capability-scoped subscriptions, and audit

Harmovela also recommends consistently named relationship fields such as `session_id`, `conversation_id`, `task_id`, `correlation_id`, and `causation_id`. These fields are optional and composable, not mandatory or hierarchical. Detailed consumer semantics for belief revision after context or memory invalidation remain future specification work.

## Coordination Model

Harmovela does not define a separate protocol for each concern. It provides one coherent coordination surface:

- Events carry what changed.
- Tasks represent work in flight.
- State describes the current known truth.
- Context and memory events inform cognitive decisions.
- Delegation assigns work across agents.
- Recovery primitives enable resilience.
- Governance defines who may do what.

## Major Components

### Agent

An agent is a producer and consumer of events. It may publish messages, subscribe to topics, launch async tasks, receive progress, react to context changes, and coordinate with other agents.

### Tool

A tool may expose synchronous MCP calls, asynchronous Harmovela tasks, or both. A slow tool can accept work quickly and emit task lifecycle events over Harmovela.

### Memory System

A memory system emits events when facts, episodes, preferences, constraints, summaries, or retrieval results change. It may also consume agent events to build long-term memory.

### Context Provider

A context provider emits updates, invalidations, snapshots, and readiness events. This allows an agent to avoid stale context without constant polling.

### Environment Observer

An observer watches external state such as browsers, files, robots, APIs, sensors, logs, or user activity and emits events into Harmovela.

### Orchestrator

An orchestrator coordinates subscriptions, routes events, tracks task lifecycle, applies delivery policy, and bridges transports.

## Protocol Layers

### 1. Transport Binding

Harmovela should support several transports:

- `stdio` for local process integration
- `WebSocket` for bidirectional local or remote streams
- `HTTP SSE` for server-to-client event streams
- `gRPC stream` for strongly typed service integration
- `NATS`, `Kafka`, or `Redis Streams` for durable production deployments

The protocol should not require one transport. Each binding must declare its delivery behavior.

### 2. Session Layer

The session layer handles initialization, capability negotiation, heartbeat, authentication metadata, and graceful shutdown.

Example responsibilities:

- Protocol version negotiation
- Supported event types
- Supported transports
- Delivery guarantees
- Replay support
- Maximum payload size
- Compression support

### 3. Event Envelope Layer

All messages use a common envelope with stable fields for identity, source, target, causality, correlation, timestamps, and payload.

The envelope is the most important interoperability surface.

### 4. Subscription Layer

Consumers subscribe to event streams by topic, type pattern, source, target, conversation, task, or domain.

Examples:

- Subscribe to all events for `task_123`.
- Subscribe to `memory.*` for a session.
- Subscribe to `tool.call.*` from a crawler tool.
- Subscribe to `agent.message.*` targeted at `agent:planner`.

### 5. Task Lifecycle Layer

Long-running work is represented as a task stream. A task is not a single response. It is a sequence of events with clear lifecycle semantics.

Standard task states:

- `submitted`
- `accepted`
- `running`
- `blocked`
- `progress`
- `output`
- `completed`
- `failed`
- `cancelled`
- `timed_out`

### 6. Domain Event Layer

Domain events describe specific systems such as memory, context, tools, environment observers, and agent messages.

The core protocol should define common domain families but allow extension.

## Data Flow Examples

### Async Tool Call

```text
Agent -> Harmovela: tool.call.requested
Harmovela -> Tool: tool.call.requested
Tool -> Harmovela: tool.call.accepted
Tool -> Harmovela: tool.call.progress
Tool -> Harmovela: tool.call.output
Tool -> Harmovela: tool.call.completed
Harmovela -> Agent: task result events
```

### Memory Update

```text
Agent -> Tool: synchronous MCP call
Tool -> Memory: stores new fact
Memory -> Harmovela: memory.fact.added
Harmovela -> subscribed agents: memory.fact.added
Agent -> Harmovela: event.acknowledged
```

### Context Invalidation

```text
Context provider -> Harmovela: context.invalidated
Harmovela -> Agent: context.invalidated
Agent -> MCP or Harmovela: requests fresh context
Context provider -> Harmovela: context.snapshot.ready
```

### Delegation

```text
Orchestrator -> Harmovela: task.delegated (task_id, from_agent, to_agent)
Harmovela -> from_agent: task.delegated (ack)
Harmovela -> to_agent: task.delegated (new assignment)
to_agent -> Harmovela: task.delegation.accepted
to_agent -> Harmovela: task.running
```

### Recovery

```text
Harmovela -> dead_letter: delivery.failed (after retry policy exhausted)
Orchestrator -> Harmovela: delivery.replay.requested (cursor)
Harmovela -> Agent: replay stream from cursor
Agent -> Harmovela: event.acknowledged (idempotent check on event_id)
```

## Module Architecture

Harmovela ships with 10+ dimension modules and 5 infrastructure modules:

### Dimension Modules

Each dimension module owns its event type registry and the public contracts for its coordination concern. Dimension modules are independently publishable and have no imports from other dimension internals.

| Dimension | Concern |
|---|---|
| Event | Envelope validation, sessions, subscriptions, routing, transport contracts |
| Recovery | Delivery tracker, delivery journal, retry policy, dead-letter, durability stores |
| Governance | RBAC authorization policy, capability-based access control, audit trail |
| Task | Task state machine, lifecycle transitions, task event types |
| State | State snapshots, incremental deltas, freshness window metadata |
| Context / Memory | Facts, episodes, preferences, invalidation, belief revision |
| Delegation | Ownership transfer, handoff, escalation, cancellation propagation |
| Tool | Tool invocation lifecycle, MCP bridge integration |
| Agent | Agent-to-agent messaging, request/response, decision recording |
| Environment | Environment observation, change detection, alerting |
| Adaptation | Feedback/outcome correlation, budget authority and enforcement |

### Infrastructure Modules

Infrastructure modules provide cross-cutting runtime support and are not dimension-specific.

| Module | Concern |
|---|---|
| Harness | Runtime ingress/egress enforcement, dimension wiring, policy dispatch |
| Runtime | Daemon process, HTTP API, transport lifecycle, configuration management |
| CLI | Command-line interface for publish, subscribe, conformance, and administration |
| Conformance | Cross-language test runner, profile fixtures, compliance verification |
| MCP Bridge | Protocol bridge between MCP synchronous calls and Harmovela async events |

## Reliability Model

Harmovela should support multiple reliability levels:

- **Best effort**: transient events, no replay guarantee.
- **At least once**: durable delivery with possible duplicates.
- **Exactly once illusion**: consumer-side idempotency using event IDs.
- **Replayable stream**: consumers can reconnect from a cursor.

The protocol should require globally unique event IDs and recommend idempotent consumers.

## Security Model

Harmovela needs security at the identity, subscription, and payload levels.

Required concepts:

- Producer identity
- Consumer identity
- Capability-scoped subscriptions
- Targeted delivery
- Optional payload redaction
- Audit trail for durable deployments

The first version can define metadata hooks without prescribing a full authentication system.
