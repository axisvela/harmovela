# AEP Go Reference

Go reference implementation of the Agent Event Protocol draft.

## Setup

```sh
cd reference/go
```

No external dependencies. Requires Go 1.21+.

## Run Tests

```sh
go test ./aep/ -v
```

Conformance tests consume the shared manifest and fixtures from `../../../conformance/`.

## Current Scope

- Typed envelope and field-level validation
- Standard draft event type registry
- Standard error model with typed error codes
- Event router with pattern-matching dispatch
- Session lifecycle state machine (opened, ready, closed, error)
- Task lifecycle tracking with valid state transitions
- Subscription create and cancel
- Manifest-driven C0 and C1 conformance tests
- Shared fixture integration from `../../../conformance/fixtures/`
