# Harmovela Event Contract

> Status: draft. Language-neutral contract boundary.

## Ownership

Event owns envelope validation, registry lookup, session lifecycle, subscription matching, routing, and transport contracts.

The existing specifications define the behavior within those responsibilities: envelope and conformance rules, [event registry governance](event-registry-governance.md), [session lifecycle](session.md), [subscription model](subscription.md), and the transport binding specifications in this directory. This contract assigns ownership without duplicating their wire fields or transport binding details.

## Event Registry Ownership

Event owns only the control entries needed to establish, route, and end an Event interaction. The registry is not a catalog of domain events.

| Control area | Event registry entries | Ownership boundary |
| --- | --- | --- |
| Envelope | No event type; the envelope fields and validation rules | Event validates envelopes before registry lookup or routing. |
| Session | `session.opened`, `session.ready`, `session.heartbeat`, `session.closed`, `session.error` | Session lifecycle and negotiation control. |
| Capability negotiation | `capabilities.requested`, `capabilities.declared`, `capabilities.changed` | Session and transport capability control. |
| Subscription | `subscription.requested`, `subscription.created`, `subscription.rejected`, `subscription.cancelled`, `subscription.expired` | Subscription creation, confirmation, rejection, and termination. |
| Routing | The session and subscription control entries above | Routing uses envelope targets, topics, and subscription filters; it introduces no separate domain event family. |
| Transport control | The session and capability entries above | Transport bindings carry Event envelopes but do not add transport-specific registry entries. |

Task, State, Context/Memory, Delegation, Recovery, and Governance types are owned by their respective dimension modules. They are not Event registry entries. In particular, Recovery owns delivery and replay control types; Event routing must not claim them as Event-owned entries.

## Public Contracts

Consumers may validate envelopes, negotiate sessions, create or cancel subscriptions, route envelopes, and use declared transport bindings. Consumers must not import Event implementation internals.

Event exposes these capabilities as public contracts so dimension modules can depend on the boundary rather than a language-specific implementation.

## Dependencies

Event has no dimension-module dependency.
