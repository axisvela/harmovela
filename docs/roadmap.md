# AEP Roadmap

## Phase 0: Vision And Design

Goal: define the project direction clearly enough for external review.

Deliverables:

- Vision document
- Architecture document
- Protocol design draft
- MCP relationship document
- Initial terminology

## Phase 1: Core Specification Draft

Goal: produce a minimal implementable protocol specification.

Deliverables:

- Event envelope JSON Schema (`schemas/aep-envelope.schema.json`)
- Standard event type registry (`reference/typescript/src/event-types.js`)
- Session and capability negotiation spec (`docs/specs/session.md`)
- Subscription spec (`docs/specs/subscription.md`)
- Task lifecycle spec (`docs/specs/task-lifecycle.md`)
- Error model (`docs/specs/error-model.md`)
- Versioning rules (`docs/specs/versioning.md`)
- Shared conformance fixtures for reference implementations (`conformance/fixtures/`)

## Phase 2: Transport Bindings

Goal: define how AEP runs over common transports.

Initial bindings:

- `stdio` for local process integration (`docs/specs/transport-stdio.md`, implemented in `reference/typescript/src/transport/stdio.js`)
- `WebSocket` for bidirectional streams (`docs/specs/transport-websocket.md`, implemented in `reference/typescript/src/transport/websocket.js`)
- `HTTP SSE` for server-to-client event streams (`docs/specs/transport-sse.md`, implemented in `reference/typescript/src/transport/sse.js`)

Later bindings:

- gRPC streaming
- NATS
- Kafka
- Redis Streams

## Phase 3: Reference Implementation

Goal: prove the spec with a small, understandable implementation.

Deliverables:

- TypeScript reference server and client
- Python reference client
- JSON Schema validation
- Simple local router
- Example async tool
- Example memory event producer
- Example agent subscriber
- Cross-language conformance tests using shared fixtures

## Phase 4: MCP Bridge

Goal: demonstrate clean interop with MCP.

Deliverables:

- MCP tool call to AEP task bridge (`reference/typescript/src/bridge/mcp-bridge.js`)
- AEP task completion events from MCP tools
- Example MCP server emitting AEP events (`reference/typescript/examples/mcp-bridge/demo.js`)
- Example agent consuming both MCP and AEP

## Phase 5: Reliability And Production Semantics

Goal: support durable and distributed deployments.

Deliverables:

- Replay cursors (`docs/specs/delivery.md`)
- Acknowledgement protocol (`docs/specs/delivery.md`)
- Dead-letter events (`docs/specs/reliability.md`, `reference/typescript/src/delivery.js`)
- Retry policy metadata (`docs/specs/reliability.md`, `reference/typescript/src/delivery.js`)
- Authorization model (`docs/specs/reliability.md` — draft hooks reserved)
- Multi-tenant routing model (`docs/specs/reliability.md` — field reserved)

## Phase 6: Ecosystem And Governance

Goal: make AEP usable as a general open protocol.

Deliverables:

- Public specification site
- Compatibility test suite
- Conformance levels
- Event registry governance
- Contribution guide
- Security considerations

## Suggested First Milestone

The first milestone should be **AEP 0.1 Draft**:

- One event envelope
- One subscription model
- One async task lifecycle
- One context event family
- One memory event family
- Two transport bindings: stdio and WebSocket
- One MCP bridge example

This is small enough to implement but broad enough to prove that AEP is not memory-specific and not merely an MCP extension.
