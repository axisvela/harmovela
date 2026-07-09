# AEP Architecture

## Architectural Position

AEP sits beside MCP as an asynchronous communication protocol for agentic systems.

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
      AEP
        |
        | tools, memory, context, environments, agents, orchestrators
```

MCP answers: "What can I call, and what is the result now?"

AEP answers: "What happened, what is still happening, and what should I react to?"

## Major Components

### Agent

An agent is a producer and consumer of events. It may publish messages, subscribe to topics, launch async tasks, receive progress, react to context changes, and coordinate with other agents.

### Tool

A tool may expose synchronous MCP calls, asynchronous AEP tasks, or both. A slow tool can accept work quickly and emit task lifecycle events over AEP.

### Memory System

A memory system emits events when facts, episodes, preferences, constraints, summaries, or retrieval results change. It may also consume agent events to build long-term memory.

### Context Provider

A context provider emits updates, invalidations, snapshots, and readiness events. This allows an agent to avoid stale context without constant polling.

### Environment Observer

An observer watches external state such as browsers, files, robots, APIs, sensors, logs, or user activity and emits events into AEP.

### Orchestrator

An orchestrator coordinates subscriptions, routes events, tracks task lifecycle, applies delivery policy, and bridges transports.

## Protocol Layers

### 1. Transport Binding

AEP should support several transports:

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
Agent -> AEP: tool.call.requested
AEP -> Tool: tool.call.requested
Tool -> AEP: tool.call.accepted
Tool -> AEP: tool.call.progress
Tool -> AEP: tool.call.output
Tool -> AEP: tool.call.completed
AEP -> Agent: task result events
```

### Memory Update

```text
Agent -> Tool: synchronous MCP call
Tool -> Memory: stores new fact
Memory -> AEP: memory.fact.added
AEP -> subscribed agents: memory.fact.added
Agent -> AEP: event.acknowledged
```

### Context Invalidation

```text
Context provider -> AEP: context.invalidated
AEP -> Agent: context.invalidated
Agent -> MCP or AEP: requests fresh context
Context provider -> AEP: context.snapshot.ready
```

## Reliability Model

AEP should support multiple reliability levels:

- **Best effort**: transient events, no replay guarantee.
- **At least once**: durable delivery with possible duplicates.
- **Exactly once illusion**: consumer-side idempotency using event IDs.
- **Replayable stream**: consumers can reconnect from a cursor.

The protocol should require globally unique event IDs and recommend idempotent consumers.

## Security Model

AEP needs security at the identity, subscription, and payload levels.

Required concepts:

- Producer identity
- Consumer identity
- Capability-scoped subscriptions
- Targeted delivery
- Optional payload redaction
- Audit trail for durable deployments

The first version can define metadata hooks without prescribing a full authentication system.
