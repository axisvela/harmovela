# Harmovela Conformance

> Status: draft. Part of the Harmovela 0.2 specification.

## Purpose

Define observable compatibility levels for Harmovela implementations. Conformance levels are cumulative and describe externally visible behavior, not internal architecture.

## Levels

### HARMOVELA-C0: Envelope And Schema (core)

An HARMOVELA-C0 implementation can parse Harmovela envelopes and validate shared schema assets.

Required behavior:

- Accept valid envelopes from shared conformance fixtures.
- Reject envelopes missing required fields.
- Reject unsupported protocol versions.
- Reject unknown or malformed standard event types.
- Validate `schemas/aep-envelope.schema.json`.
- Validate `schemas/subscription-filter.schema.json` when checking subscription filters.

### HARMOVELA-C1: Core Runtime (core)

An HARMOVELA-C1 implementation supports the core local runtime protocol. HARMOVELA-C1 includes all HARMOVELA-C0 behavior.

Required behavior:

- Process session open, ready, heartbeat, error, and close flows.
- Create, validate, and cancel subscriptions using standard filter fields.
- Route events according to type, source, target, topic, session, task, and metadata filters.
- Process task lifecycle events for accepted, started, progress, blocked, resumed, completed, failed, cancelled, and timed out states.
- Emit standard error payloads for invalid protocol actions.

### HARMOVELA-C2: Delivery And Reliability (delivery profile)

An HARMOVELA-C2 implementation supports observable delivery semantics for distributed or durable deployments. HARMOVELA-C2 includes all HARMOVELA-C0 and HARMOVELA-C1 behavior.

Required behavior:

- Track delivery sequence and cursor state.
- Process acknowledgement and negative acknowledgement events.
- Apply retry policy metadata consistently.
- Move exhausted deliveries to dead-letter state.
- Expose replay behavior through observable event sequences.

### HARMOVELA-C3: End-to-End Delivery Tracking (delivery profile)

An HARMOVELA-C3 implementation supports end-to-end delivery tracking including track, ack, nack, dead-letter, and DeliveryTracker stats verification. HARMOVELA-C3 includes all HARMOVELA-C0, HARMOVELA-C1, and HARMOVELA-C2 behavior.

Required behavior:

- Emit tracking events for message lifecycle (published, dispatched, delivered, acknowledged) with timestamps, sequence, and cursors.
- Support at-least-once delivery with idempotent event receipt.
- Route exhausted deliveries to dead-letter with full metadata preservation.
- Expose DeliveryTracker statistics (in-flight count, acknowledged count, dead-letter count, latency percentiles).
- Support replay of dead-letter events with configurable batch window and rate limiting.
- Accept nack events with actionable error codes for selective retry decisions.

## Shared Manifest

Shared conformance fixtures are described by `conformance/manifest.json`.

Manifest paths are relative to `conformance/`. A runner declares a target level and executes every fixture at or below that level. Runners must ignore higher-level fixtures unless explicitly configured to verify that level.

The default target level for Harmovela 0.2 reference runners is HARMOVELA-C3.

## Fixture Expectations

`accept_all` means every fixture event must pass envelope and schema validation.

`stateful_flow` means every fixture event must pass validation and must be accepted by the reference harness without producing `event.rejected`.

`reject_some` is reserved for future negative fixtures.
