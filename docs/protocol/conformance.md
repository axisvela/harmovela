# AEP Conformance

> Status: draft. Part of the AEP 0.1 protocol specification.

## Purpose

Define observable compatibility levels for AEP implementations. Conformance levels are cumulative and describe externally visible behavior, not internal architecture.

## Levels

### AEP-C0: Envelope And Schema

An AEP-C0 implementation can parse AEP envelopes and validate shared schema assets.

Required behavior:

- Accept valid envelopes from shared conformance fixtures.
- Reject envelopes missing required fields.
- Reject unsupported protocol versions.
- Reject unknown or malformed standard event types.
- Validate `schemas/aep-envelope.schema.json`.
- Validate `schemas/subscription-filter.schema.json` when checking subscription filters.

### AEP-C1: Core Runtime

An AEP-C1 implementation supports the core local runtime protocol. AEP-C1 includes all AEP-C0 behavior.

Required behavior:

- Process session open, ready, heartbeat, error, and close flows.
- Create, validate, and cancel subscriptions using standard filter fields.
- Route events according to type, source, target, topic, session, task, and metadata filters.
- Process task lifecycle events for accepted, started, progress, blocked, resumed, completed, failed, cancelled, and timed out states.
- Emit standard error payloads for invalid protocol actions.

### AEP-C2: Delivery And Reliability

An AEP-C2 implementation supports observable delivery semantics for distributed or durable deployments. AEP-C2 includes all AEP-C0 and AEP-C1 behavior.

Required behavior:

- Track delivery sequence and cursor state.
- Process acknowledgement and negative acknowledgement events.
- Apply retry policy metadata consistently.
- Move exhausted deliveries to dead-letter state.
- Expose replay behavior through observable event sequences.

## Shared Manifest

Shared conformance fixtures are described by `conformance/manifest.json`.

Manifest paths are relative to `conformance/`. A runner declares a target level and executes every fixture at or below that level. Runners must ignore higher-level fixtures unless explicitly configured to verify that level.

The default target level for AEP 0.1 draft reference runners is AEP-C1.

## Fixture Expectations

`accept_all` means every fixture event must pass envelope and schema validation.

`stateful_flow` means every fixture event must pass validation and must be accepted by the reference harness without producing `event.rejected`.

`reject_some` is reserved for future negative fixtures.
