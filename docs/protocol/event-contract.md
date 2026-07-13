# Harmovela Event Contract

> Status: draft. Language-neutral contract boundary.

## Ownership

Event owns envelope validation, registry lookup, session lifecycle, subscription matching, routing, and transport contracts.

The existing specifications define the behavior within those responsibilities: envelope and conformance rules, [event registry governance](event-registry-governance.md), [session lifecycle](session.md), [subscription model](subscription.md), and the transport binding specifications in this directory. This contract assigns ownership without duplicating their wire fields or transport binding details.

## Public Contracts

Consumers may validate envelopes, negotiate sessions, create or cancel subscriptions, route envelopes, and use declared transport bindings. Consumers must not import Event implementation internals.

Event exposes these capabilities as public contracts so dimension modules can depend on the boundary rather than a language-specific implementation.

## Dependencies

Event has no dimension-module dependency.
