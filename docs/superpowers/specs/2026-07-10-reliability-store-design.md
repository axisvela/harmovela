# Reliability Store Implementation Design

Date: 2026-07-10

## Goal

Refactor the TypeScript `DeliveryTracker` to use a pluggable store abstraction, add an in-memory store implementation, and add an event journal for replay retention. This moves the delivery subsystem from hard-coded internal Maps to a testable, swappable backend.

## Non-Goals

- Do not add a file-backed or network-backed store in this slice.
- Do not implement per-subscription cursor tracking or multi-tenant isolation.
- Do not change the delivery or reliability specs.
- Do not introduce new AEP event types or protocol behavior.
- Do not add Go or Python store implementations.

## Approach

Define a minimal `DeliveryStore` contract, implement an `InMemoryDeliveryStore` that replicates the current Map-based behavior, add a `DeliveryJournal` for event retention, and make `DeliveryTracker` depend on the store/journal through constructor injection. Existing tests and conformance must pass unchanged.

## Components

### DeliveryStore Interface

`reference/typescript/src/delivery-store.js`

A contract, not a class. Documentation-only or a simple object shape check.

Required methods:

- `track(eventId, subscriptionId, entry)` — register a pending delivery, return sequence number.
- `ack(eventId)` — mark delivery as acknowledged, return boolean.
- `nack(eventId)` — increment attempt counter, return updated attempts count or false.
- `deadLetter(eventId, reason)` — move delivery to dead-letter state, return dead-letter record or null.
- `getPending()` — return array of pending entries.
- `getPendingForSubscription(subscriptionId)` — return filtered pending entries.
- `isAcknowledged(eventId)` — return boolean.
- `isPending(eventId)` — return boolean.
- `hasAttemptsRemaining(eventId, maxAttempts)` — return boolean.
- `getStats()` — return stats object with `totalSequences`, `pending`, `acknowledged`, `deadLettered`, `lastAckCursor`.

### InMemoryDeliveryStore

`reference/typescript/src/delivery-store-memory.js`

Implements the store contract using Maps for pending, acknowledged, and dead-lettered. Matches the current `DeliveryTracker` internal behavior exactly.

### DeliveryJournal

`reference/typescript/src/delivery-journal.js`

A sequence-ordered event journal for replayable delivery mode.

Required methods:

- `append(event)` — add an event with sequence number, return sequence.
- `replay(since)` — return events since a given cursor.
- `replaySinceSequence(seq)` — return events since a sequence number.
- `purge(before)` — remove events before a cursor.
- `getStats()` — return journal stats (total events, oldest/newest sequence).

### DeliveryTracker Refactoring

`reference/typescript/src/delivery.js`

- Constructor accepts `store` option (defaults to `new InMemoryDeliveryStore()`).
- Constructor accepts `journal` option (defaults to `new DeliveryJournal()`).
- Internal Map fields (`_pending`, `_acked`, `_deadLettered`) are replaced by store calls.
- Public API (`track`, `ack`, `nack`, `deadLetter`, `getPending`, `stats`, etc.) delegates to store.
- `retryDelay` function unchanged.

## Testing

- `reference/typescript/test/delivery-store.test.js` — unit tests for InMemoryDeliveryStore contract.
- `reference/typescript/test/delivery-journal.test.js` — unit tests for journal append/replay/purge.
- `reference/typescript/test/delivery.test.js` — existing tests pass unchanged; add one test verifying store injection.

Verification commands:

```sh
cd reference/typescript && npm test
cd reference/typescript && npm run conformance
```

## Open Decisions Resolved

- Store interface is a documentation contract, not a TypeScript interface (no build step).
- InMemoryDeliveryStore replaces internal Maps with identical semantics.
- DeliveryJournal is sequence-ordered, in-memory, no persistence.
- DeliveryTracker defaults preserve backward compatibility; no existing callers need changes.
