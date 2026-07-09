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

- Event envelope JSON Schema
- Standard event type registry
- Session and capability negotiation spec
- Subscription spec
- Task lifecycle spec
- Error model
- Versioning rules
- Shared conformance fixtures for reference implementations

## Phase 2: Transport Bindings

Goal: define how AEP runs over common transports.

Initial bindings:

- `stdio` for local process integration
- `WebSocket` for bidirectional streams
- `HTTP SSE` for server-to-client event streams

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

- MCP tool call to AEP task bridge
- AEP task completion events from MCP tools
- Example MCP server emitting AEP events
- Example agent consuming both MCP and AEP

## Phase 5: Reliability And Production Semantics

Goal: support durable and distributed deployments.

Deliverables:

- Replay cursors
- Acknowledgement protocol
- Dead-letter events
- Retry policy metadata
- Authorization model
- Multi-tenant routing model

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
