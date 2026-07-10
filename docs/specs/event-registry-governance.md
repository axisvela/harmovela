# AEP Event Registry Governance

> Status: draft. Part of the AEP 0.1 protocol specification.

## Purpose

Define how the standard event type registry is governed, extended, and versioned.

## Standard Event Types

The standard event type registry is defined in each language reference:

| Language | File |
|---|---|
| TypeScript | `reference/typescript/src/event-types.js` |
| Python | `reference/python/src/aep/event_types.py` |
| Go | `reference/go/aep/event_types.go` |
| Java | `reference/java/src/main/java/com/axisrobo/aep/EventTypes.java` |

All implementations share the same set of standard types. The shared conformance manifest defines fixture-level expectations for each event family.

## Event Families

| Family | Prefix | Scope |
|---|---|---|
| Session | `session.*` | Session lifecycle: opened, ready, heartbeat, closed, error |
| Capabilities | `capabilities.*` | Capability negotiation: requested, declared, changed |
| Subscription | `subscription.*` | Pub/sub lifecycle: requested, created, rejected, cancelled, expired |
| Delivery | `event.*` | Delivery semantics: acknowledged, rejected, redelivered, replayed, dead_lettered |
| Tool | `tool.call.*` | Tool invocation lifecycle (MCP bridge) |
| Task | `task.*` | Async task lifecycle |
| Context | `context.*` | Context provider events |
| Memory | `memory.*` | Memory system events |
| Agent | `agent.*` | Agent-to-agent messages |
| Environment | `environment.*` | Environment observer events |

## Adding a New Event Type

1. Propose the new type with a description in an issue or PR.
2. If it belongs to an existing family, prefix accordingly (e.g., `memory.*`).
3. If it defines a new family, select a clear, single-word prefix.
4. Add the type to each language's event type registry.
5. Add at least one conformance fixture exercising the type.
6. Update at least the TypeScript reference to handle the new type if it carries semantics beyond envelope validation.

## Adding a New Event Family

1. Propose the family with motivation and initial event types.
2. Define the family's scope in `docs/specs/` if it has protocol semantics.
3. Add all initial types to each language registry.
4. Add conformance fixtures for the family.
5. Implement handling in at least the TypeScript reference.

## Versioning

- Event types are tied to the AEP protocol version (currently 0.1).
- Types may be added in minor versions but not removed.
- Deprecated types remain in the registry with a deprecation note.
- Breaking changes to event semantics require a new major version.

## Cross-Reference Consistency

The `conformance/manifest.json` serves as the source of truth for which event types are expected in each fixture. All language references must agree on the standard registry.

To verify consistency:

```sh
node tools/conformance-runner.js
```
