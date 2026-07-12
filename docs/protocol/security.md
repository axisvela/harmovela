# Harmovela Security Model

> Status: draft. Part of the Harmovela 0.2 security profile.

## Purpose

Define the identity, authorization, and audit boundaries for AEP communication. AEP does not prescribe a specific authentication protocol; this document defines the security metadata hooks that transports and implementations must respect.

## Design Principle

AEP security is **defense in layers**:

1. **Transport-level security** (TLS, mTLS, SSH tunnels) — handled by the transport binding, not AEP.
2. **AEP-level identity** — who is sending and receiving events.
3. **AEP-level authorization** — what a given identity is allowed to send, subscribe to, or receive.
4. **AEP-level audit** — what happened, recorded for inspection.

AEP layer 2-4 are the scope of this specification.

## Identity Model

### Producer Identity

Every event carries a `source` field that identifies the producer:

```json
{
  "source": "tool:web_crawler",
  ...
}
```

The source format uses a dotted prefix convention:

| Prefix | Meaning | Example |
|---|---|---|
| `agent:` | An agent instance | `agent:researcher` |
| `tool:` | A tool or tool server | `tool:web_crawler` |
| `memory:` | A memory system | `memory:main` |
| `context:` | A context provider | `context:browser` |
| `environment:` | An environment observer | `environment:sensors` |
| `harness:` | Protocol harness or orchestrator | `harness:aep` |

### Consumer Identity

Every event may carry a `target` field that identifies the intended consumer:

```json
{
  "target": "agent:researcher",
  ...
}
```

Missing `target` means the event is broadcast (subject to subscription matching).

### Identity Verification

Identity claims in `source` and `target` must be verifiable. The verification mechanism is transport-specific:

- **stdio**: The process identity is the transport identity (OS-level process). The transport provides the identity claim.
- **WebSocket**: TLS client certificates provide transport-level identity. The AEP identity is mapped from the certificate.
- **HTTP SSE**: HTTP headers (e.g., `Authorization: Bearer`) or mTLS provide identity.

A transport that cannot verify identity must reject events with a falsified `source` field.

## Authorization Model

### Capability-Scoped Subscriptions

A subscription is scoped to the capabilities of the subscribing identity. An identity may only subscribe to events it is authorized to receive.

Capability negotiation during `session.ready` may include authorization constraints:

```json
{
  "type": "session.ready",
  "payload": {
    "capabilities": {
      "auth": {
        "required": true,
        "scopes": ["read:memory", "write:tool", "subscribe:task.*"]
      }
    }
  }
}
```

| Scope | Meaning |
|---|---|
| `read:<domain>` | May receive events from the domain |
| `write:<domain>` | May send events to the domain |
| `subscribe:<pattern>` | May subscribe to event type patterns |

### Subscription Enforcement

When a consumer requests a subscription, the producer must verify that the consumer's scopes cover the requested filter:

1. For each `types` pattern in the subscription filter, check that the consumer has a matching `subscribe:` scope.
2. For each `source` filter, check that the consumer has `read:` scope for the source domain.
3. If any check fails, reject the subscription with `unauthorized`.

```json
{
  "type": "subscription.rejected",
  "payload": {
    "error": {
      "code": "unauthorized",
      "message": "agent:researcher is not authorized to subscribe to memory.*"
    }
  }
}
```

### Targeted Delivery Enforcement

When an event has a `target` field, the producer must verify that the producer is authorized to send to that target. An identity may only target identities within its authorized scope.

## Event-Level Authorization

Events may carry an `authorization` field for transport-agnostic auth tokens:

```json
{
  "authorization": {
    "scheme": "bearer",
    "token": "eyJhbGci..."
  }
}
```

The `authorization` field is optional. When present:

- The `scheme` field declares the token type (e.g., `bearer`, `capability`).
- The `token` field carries the credential.
- The producer and consumer must agree on the scheme during capability negotiation.

A producer that does not support the requested scheme must reject the event with `unauthorized`.

## Payload Redaction

Sensitive data in event payloads may be redacted before delivery to unauthorized consumers. The redaction policy is implementation-defined, but AEP defines metadata for declaring sensitivity:

```json
{
  "payload": {
    "user_query": "what is the capital of France",
    "_redacted": ["financial_data", "pii"]
  }
}
```

The `_redacted` key (reserved, prefix `_`) declares that specific fields in the payload were removed before delivery. Consumers should treat `_redacted` as informational and not attempt to reconstruct the removed data.

## Audit Trail

Productions deployments should maintain an audit trail of all AEP events. The minimum audit record for each event includes:

| Field | Source |
|---|---|
| Event `id` | Envelope |
| Event `type` | Envelope |
| `source` identity | Envelope |
| `target` identity | Envelope |
| `created_at` | Envelope |
| Transport identity | Transport binding |
| Auth identity (if different from source) | Transport or envelope `authorization` |
| Delivery status | Delivery tracker |

Audit records are implementation-specific and not defined by the AEP wire protocol. A conformant implementation may expose audit events as AEP events (e.g., `audit.event.delivered`), but this is not required.

## Threat Model Summary

| Threat | Mitigation |
|---|---|
| Impersonation (spoofed `source`) | Transport-level identity verification |
| Unauthorized subscription | Capability-scoped subscription enforcement |
| Unauthorized targeted delivery | Producer-to-target authorization check |
| Eavesdropping | Transport-level encryption (TLS) |
| Payload data leak | Payload redaction before delivery |
| Replay attacks | Event `id` idempotency + idempotent consumers |
| Audit tampering | Append-only audit log, external to AEP |

## Multi-Tenant Isolation

In shared deployments, the `tenant_id` envelope field provides namespace isolation:

```json
{
  "tenant_id": "org_acme",
  ...
}
```

Rules:

- Events with `tenant_id` must not be delivered to sessions of a different tenant.
- Subscriptions are scoped to the tenant of the subscribing session.
- A session without `tenant_id` is single-tenant and isolated by definition.

Tenant isolation is enforced by the producer/orchestrator, not by the protocol wire format.

## Implementation Notes

- The `authorization` envelope field is defined by this spec but no mandatory scheme is defined in AEP 0.1. Implementations may use `bearer` tokens, capability URLs, or custom schemes.
- The `_redacted` payload prefix is reserved. Implementations must not use this prefix for application data.
- Capability scopes use glob-style pattern matching (same as event type matching).
- Transport bindings may define additional security requirements (e.g., WebSocket mandates TLS for `wss://`).
