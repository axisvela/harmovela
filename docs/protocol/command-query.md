# Harmovela Command and Query Protocol

> Status: draft. Part of the Harmovela 0.2 specification. L2 Coordination layer capability.

## Purpose

Define directed request/response primitives that complement the Harmovela event substrate. Commands represent directed instructions to a specific agent. Queries represent directed information requests with snapshot-versioned responses.

Both Command and Query are L2 Coordination layer capabilities, not L3 Adaptation. They inherit governance enforcement (RBAC, tenant isolation) from the Governance dimension and use the standard event envelope for delivery.

## Command

A Command is a **directed instruction** from one agent to another. The commanding agent issues `command.requested` with a specific `target` agent. The harness validates authorization and routing, then emits `command.accepted` within a negotiation window or `command.rejected` if validation fails. The target agent completes the command lifecycle with `command.completed` or `command.failed`.

### Event Types

| Event | Direction | Description |
|---|---|---|
| `command.requested` | source → harness | A directed instruction carrying target agent, correlation_id, delegation chain, and authorization scope |
| `command.accepted` | harness → source | Command validated and routed to target within negotiation window |
| `command.rejected` | harness → source | Command rejected due to validation failure (missing target, unauthorized, unknown target agent) |
| `command.completed` | target → source (via harness) | Command executed successfully by target agent |
| `command.failed` | target → source (via harness) | Command execution failed by target agent |

### Lifecycle

```text
Happy path:
  source → command.requested → harness
  harness → command.accepted → source
  harness → command.requested → target (routed)
  target → command.completed → source (via harness)

Rejection path:
  source → command.requested → harness
  harness → command.rejected → source

Failure path:
  source → command.requested → harness
  harness → command.accepted → source
  harness → command.requested → target (routed)
  target → command.failed → source (via harness)
```

### Required Envelope Fields

| Field | Required | Description |
|---|---|---|
| `type` | Yes | One of the `command.*` event types |
| `source` | Yes | Commanding agent identity |
| `target` | Yes | Target agent identity (who must execute the command) |
| `correlation_id` | Yes | Logical operation correlation key linking request to responses |
| `created_at` | Yes | Event creation timestamp |
| `id` | Yes | Globally unique event ID |
| `spec_version` | Yes | Protocol version |

### Recommended Envelope Fields

| Field | Description |
|---|---|
| `session_id` | Runtime session |
| `conversation_id` | Conversation or interaction thread |
| `causation_id` | Event that caused this event (for chaining) |
| `payload.command` | The command name or identifier |
| `payload.args` | Command arguments |
| `payload.authorization_scope` | Permission scope required for execution |
| `payload.delegation_chain` | Ordered list of agents that delegated this command |
| `payload.negotiation_window_ms` | Maximum time (ms) for acceptance decision |

### Negotiation Window

When a `command.requested` arrives, the harness must emit `command.accepted` or `command.rejected` within the negotiation window (default: 5000ms). If the harness cannot complete validation within the window, it emits `command.rejected` with reason `negotiation_timeout`.

### Authorization Scope

Every command request carries an `authorization_scope` defining the permissions required for execution. The harness validates that the commanding agent holds the required capabilities (via Governance dimension RBAC) before accepting the command. Commands crossing tenant boundaries require explicit `tenant.cross_access` capability.

### Delegation Chain

Commands may carry a `delegation_chain`: an ordered list of agent identities showing how authority was delegated to the commanding agent. The harness validates the chain against the Governance dimension's delegation policy.

## Query

A Query is a **directed information request** from one agent to another. The querying agent issues `query.requested` with a specific `target` agent and query scope. The harness validates authorization and routing, then routes the query to the target. The target responds with `query.response` carrying a snapshot version for idempotent re-query, or `query.rejected` if the query cannot be satisfied.

### Event Types

| Event | Direction | Description |
|---|---|---|
| `query.requested` | source → harness | A directed information request carrying target, query scope, freshness requirements, and pagination hint |
| `query.response` | harness/target → source | Query response carrying snapshot version for idempotent re-query |
| `query.rejected` | harness → source | Query rejected due to validation failure (missing target, unauthorized, unknown target) |
| `query.error` | target → source (via harness) | Error occurred during query execution |

### Lifecycle

```text
Happy path:
  source → query.requested → harness
  harness → query.response → source

Rejection path:
  source → query.requested → harness
  harness → query.rejected → source

Error path:
  source → query.requested → harness
  harness → query.response → source (validated)
  harness → query.requested → target (routed)
  target → query.error → source (via harness)
```

### Required Envelope Fields

| Field | Required | Description |
|---|---|---|
| `type` | Yes | One of the `query.*` event types |
| `source` | Yes | Querying agent identity |
| `target` | Yes | Target agent identity (who answers the query) |
| `correlation_id` | Yes | Logical operation correlation key linking request to response |
| `created_at` | Yes | Event creation timestamp |
| `id` | Yes | Globally unique event ID |
| `spec_version` | Yes | Protocol version |

### Recommended Envelope Fields

| Field | Description |
|---|---|
| `session_id` | Runtime session |
| `conversation_id` | Conversation or interaction thread |
| `causation_id` | Event that caused this event (for chaining) |
| `payload.query_scope` | What domain or resource the query targets |
| `payload.freshness.max_age_ms` | Maximum acceptable age of returned data |
| `payload.freshness.require_consistent` | If true, response must reflect the latest consistent snapshot |
| `payload.pagination.limit` | Maximum results per page |
| `payload.pagination.cursor` | Opaque cursor for next page (empty for first page) |
| `payload.snapshot_version` | Monotonic snapshot version carried in responses |

### Snapshot Version

Every `query.response` carries a `snapshot_version` in its payload. This is a monotonically increasing identifier representing the state snapshot against which the query was answered. The querying agent may include a `since_version` in subsequent `query.requested` events to request only delta updates. The snapshot version enables idempotent re-query: an agent may re-issue the same query against the same snapshot version and expect the same result.

### Freshness Requirements

A query may specify freshness constraints through `payload.freshness`:
- `max_age_ms`: Maximum acceptable age of the returned data. If the target's data is older, it must either refresh or reject.
- `require_consistent`: If true, the response must reflect a consistent snapshot across all relevant data sources.

### Pagination

Queries that may return large result sets support pagination through `payload.pagination`:
- `limit`: Maximum results per page.
- `cursor`: Opaque cursor returned by the previous response, used to fetch the next page. Empty for the first page.

## Governance Enforcement

Both Command and Query inherit governance enforcement from the Governance dimension:

| Check | Description |
|---|---|
| Identity verification | Source and target agent identities are verified |
| RBAC authorization | Source must hold required capabilities for the action |
| Tenant isolation | Cross-tenant commands and queries require `tenant.cross_access` capability |
| Delegation chain validation | Delegation chain is verified against policy |
| Audit | All command and query events are audited with actor identity, timestamp, and affected resource |

## Layer Classification

Command and Query are **L2 Coordination layer** capabilities. They depend on:
- L0: Event envelope, session, subscriptions (Event dimension)
- L1: Task lifecycle, state freshness (Task and State dimensions)
- Governance: RBAC, tenant isolation, audit (Governance dimension)

They are not L3 Adaptation layer capabilities. Adaptation (budget enforcement, outcome correlation, feedback) operates at a higher level of autonomy and uses commands and queries as one mechanism among several.

## Conformance Levels

| Level | Requirement |
|---|---|
| HARMOVELA-C0 | All `command.*` and `query.*` event types are registered. Invalid commands (missing target, unauthorized) are rejected. |
| HARMOVELA-C1 | Command lifecycle (requested → accepted → completed/failed) flows through harness. Query lifecycle (requested → response) returns snapshot-versioned responses. |

## Related Documents

- [Profiles](profiles.md) — `harmovela.coordination.v1` profile scope
- [Dimensions](dimensions.md) — dimension module layout
- [Governance Contract](governance-contract.md) — RBAC, tenant isolation, audit
- [Security](security.md) — identity, authorization, audit model
- [Event Contract](event-contract.md) — envelope validation
