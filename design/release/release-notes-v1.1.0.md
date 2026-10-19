# Harmovela 1.1.0 Release Notes

Date: 2026-10-19

This is an implementation release for the Go runtime. The wire protocol remains
wire-compatible with 1.0 (`spec_version` `0.2`); no profile, schema, fixture, or
wire identifier changed.

## Added

- Durable event log for replay in the Memory, SQLite, and PostgreSQL delivery
  stores.
- Cursor-based WebSocket subscription:
  - `subscription.requested` with `consumer_id`, filter, and `from_cursor`
  - replay before live delivery
  - `event.acknowledged` with consumer cursor acknowledgement
  - ack response carrying `latest_cursor` and `lag`
- Consumer offset tracking and transport-independent replay filtering.
- Safe event-log retention:
  - `delivery.retention.prune_interval_seconds`
  - prune only through the minimum acknowledged consumer cursor
  - never prune while a known consumer has no cursor
- Serialized WebSocket client writes to prevent concurrent `Send` / `Close`
  writes.

## Compatibility

- Existing clients that do not send `subscription.requested` continue to receive
  the legacy broadcast stream.
- Event envelopes are unchanged apart from additive `delivery.cursor`
  metadata.
- `spec_version` remains `0.2`.

## Note

The 1.1 external-evidence protocol gates described in `RELEASES.md` remain
tracked separately. This release claims only the implementation changes above,
not completion of those external-evidence gates.
