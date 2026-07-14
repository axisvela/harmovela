# Harmovela Agent Runtime Semantics

> Status: draft. Part of the Harmovela 0.2 runtime-semantics profile.

## Purpose

Define recommended envelope metadata fields and event types for agent-runtime concerns that go beyond transport, session, subscription, and task lifecycle: belief revision, freshness and validity, delegation and handoff, interruption and cancellation safety, and provenance and trust.

All additions are optional. No existing required fields change. All fields fall under the envelope `additionalProperties: true` policy.

## Terminology And Normative Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

Normative requirements use RFC 2119 keywords. Guidance sections that do not use these keywords are non-normative and provided for implementation convenience only.

## Epistemic Metadata

### Fields

| Field | Type | Values | Description |
|---|---|---|---|
| `belief_status` | string | `"asserted"`, `"retracted"`, `"revised"`, `"contradicted"`, `"unknown"` | Epistemic relationship of this event to prior knowledge |
| `belief_scope` | string | `"fact"`, `"inference"`, `"observation"`, `"preference"`, `"hypothesis"` | Category of the assertion |
| `confidence` | number | 0.0 – 1.0 | Optional producer-assigned confidence |

### Events

#### `belief.revised`

Emitted when an agent discovers an earlier belief was incorrect and publishes the corrected state.

```json
{
  "type": "belief.revised",
  "belief_status": "revised",
  "belief_scope": "fact",
  "confidence": 0.95,
  "causation_id": "evt_original_assertion",
  "payload": {
    "previous": "The project deadline is 2026-07-15",
    "corrected": "The project deadline is 2026-07-22",
    "reason": "stakeholder extended the schedule"
  }
}
```

#### `belief.conflict.detected`

Emitted when multiple sources assert contradictory claims about the same subject.

```json
{
  "type": "belief.conflict.detected",
  "belief_status": "contradicted",
  "payload": {
    "subject": "current temperature in Tokyo",
    "claims": [
      {"source": "weather_service_a", "value": "22C", "confidence": 0.9},
      {"source": "weather_service_b", "value": "25C", "confidence": 0.85}
    ],
    "resolution_hint": "prefer_higher_confidence"
  }
}
```

### Normative Requirements

- On `memory.fact.invalidated` with `belief_status: "retracted"`, consumers MUST inspect which working conclusions depend on the retracted fact and mark them for re-evaluation.
- On `belief.conflict.detected`, consumers that have not yet acted on contested claims SHOULD defer until a `belief.revised` or a higher-authority resolution arrives.
- `confidence` is advisory. Consumers SHOULD combine it with their own trust model; 0.95 confidence from an unverified source MAY carry less weight than 0.6 from a verified source.

## Freshness And Validity

### Fields

Distinct from `expires_at` (which governs event delivery lifetime). These fields describe when the *asserted content* becomes stale.

| Field | Type | Description |
|---|---|---|
| `valid_from` | RFC 3339 | The point in time from which the assertion is considered valid |
| `valid_until` | RFC 3339 | The point in time after which the assertion should be considered stale |
| `stale_after` | ISO 8601 duration | Relative staleness duration from `created_at` (alternative to `valid_until`) |
| `refresh_hint` | URI | Where to obtain a more current version of this assertion |

### Events

#### `freshness.expired`

Emitted by a runtime or observer when it detects cached state has exceeded its validity window.

```json
{
  "type": "freshness.expired",
  "causation_id": "evt_cached_snapshot",
  "payload": {
    "resource": "context:file_tree",
    "cached_at": "2026-07-10T09:00:00Z",
    "valid_until": "2026-07-10T09:05:00Z",
    "detected_at": "2026-07-10T09:06:00Z"
  }
}
```

#### `freshness.window.changed`

Emitted when a previously declared validity window is shortened or extended.

```json
{
  "type": "freshness.window.changed",
  "payload": {
    "resource": "memory:user_preferences",
    "previous_valid_until": "2026-07-10T10:00:00Z",
    "new_valid_until": "2026-07-10T09:30:00Z",
    "reason": "user manually updated preferences"
  }
}
```

### Normative Requirements

- When `valid_until` has passed, consumers MUST treat the assertion as potentially stale. If `refresh_hint` is present, they MAY request a fresh copy.
- When `freshness.expired` arrives for a resource the consumer relies on, it SHOULD re-read or re-request that resource before proceeding with decisions that depend on it.
- `stale_after` and `valid_until` are mutually informative. If both are present, the earliest point governs.

## Delegation And Handoff

### Fields

| Field | Type | Description |
|---|---|---|
| `delegated_by` | string | Identifier of the delegating agent or runtime |
| `delegated_to` | string | Identifier of the accepting agent or runtime |
| `parent_task_id` | string | The delegating task; establishes parent-child relationship |
| `handoff_token` | string | Opaque token proving ownership transfer |

### Events

#### `delegation.requested`

```json
{
  "type": "delegation.requested",
  "delegated_by": "agent:planner",
  "delegated_to": "agent:worker",
  "parent_task_id": "task_01",
  "task_id": "task_02",
  "payload": {
    "work_description": "Index all PDFs in the documents directory",
    "deadline": "2026-07-10T12:00:00Z",
    "priority": "normal"
  }
}
```

#### `delegation.accepted`

```json
{
  "type": "delegation.accepted",
  "delegated_by": "agent:planner",
  "delegated_to": "agent:worker",
  "parent_task_id": "task_01",
  "task_id": "task_02"
}
```

#### `delegation.rejected`

```json
{
  "type": "delegation.rejected",
  "delegated_by": "agent:planner",
  "delegated_to": "agent:worker",
  "parent_task_id": "task_01",
  "task_id": "task_02",
  "payload": {
    "reason": "worker is at capacity",
    "retry_after": "2026-07-10T12:05:00Z"
  }
}
```

#### `delegation.handoff.completed`

Emitted when ownership transfer is acknowledged by both sides.

```json
{
  "type": "delegation.handoff.completed",
  "delegated_by": "agent:planner",
  "delegated_to": "agent:worker",
  "parent_task_id": "task_01",
  "task_id": "task_02",
  "handoff_token": "ht_abc123"
}
```

#### `delegation.escalated`

Emitted when a delegated task is escalated to a supervisor or higher-authority agent.

```json
{
  "type": "delegation.escalated",
  "delegated_by": "agent:worker",
  "delegated_to": "agent:supervisor",
  "parent_task_id": "task_01",
  "task_id": "task_02",
  "payload": {
    "reason": "task exceeds worker capability",
    "progress_so_far": 0.3
  }
}
```

### Normative Requirements

- A parent task MUST NOT transition to a terminal state (COMPLETED, FAILED, CANCELLED, TIMED_OUT) while it has active (non-terminal) child tasks. Resolve or cancel all children before the parent reaches a terminal state.
- A child task MAY reach a terminal state independently of, and before, its parent. The common orchestration pattern (child completes first, parent aggregates) is valid.
- When a parent task is cancelled, all child tasks MUST be cancelled. The runtime or orchestrator SHOULD emit `task.cancelled` for each child, referencing the parent via `causation_id`.
- `handoff_token` MUST be treated as opaque. Consumers MUST NOT parse or derive information from it; its sole purpose is to verify ownership transfer against the delegating runtime.
- On `delegation.escalated`, consumers tracking the original task SHOULD route further status queries through the new delegate (`delegated_to`).

### Handoff Token Semantics

A `handoff_token` is an opaque bearer token that proves ownership transfer from the delegating agent to the delegate. It is emitted on `delegation.handoff.completed` and MUST be validated by any runtime that receives a status query or subsequent delegation event for the transferred task.

#### Token Structure

Handoff tokens are opaque strings as transmitted on the wire. Implementations that produce structured tokens SHOULD encode the following claims:

| Claim | Required | Description |
|---|---|---|
| `iss` | yes | Issuer identifier (the delegating agent, matching `delegated_by` on the event) |
| `sub` | yes | Delegate identifier (the receiving agent, matching `delegated_to` on the event) |
| `task_id` | yes | The task whose ownership is being transferred |
| `parent_task_id` | yes | The parent delegating task |
| `iat` | yes | Issued-at timestamp (RFC 3339) |
| `exp` | yes | Expiration timestamp (RFC 3339). Tokens without expiry MUST be rejected. |
| `jti` | yes | Unique token identifier (nonce) for replay protection |
| `sig` | no | Cryptographic signature. Advanced feature reserved for `harmovela.security.v2` profile work (see below). |

#### Validation Requirements

A runtime receiving a `handoff_token` MUST perform the following checks before accepting it as proof of ownership transfer:

1. **Issuer match:** The `iss` claim MUST match the `delegated_by` field on the accompanying `delegation.handoff.completed` event.
2. **Delegate match:** The `sub` claim MUST match the `delegated_to` field on the event.
3. **Task binding:** The `task_id` and `parent_task_id` claims MUST match the corresponding fields on the event.
4. **Expiry check:** The current time MUST be before the `exp` claim. Expired tokens MUST be rejected.
5. **Replay protection:** The `jti` claim MUST NOT have been observed by this runtime before. Runtimes SHOULD maintain a token replay cache with a retention period not shorter than the maximum token expiry window.
6. **Timeliness:** The `iat` claim MUST NOT be in the future (with a reasonable clock-skew tolerance of up to 60 seconds).
7. **Opaqueness:** Consumers that cannot validate token internals MUST treat the token as opaque and MUST NOT rely on it for authorization decisions beyond "the delegating runtime issued this token."

#### Delegation Event Binding

The `handoff_token` exists only within the context of a specific delegation flow:

- A token is issued on `delegation.handoff.completed`.
- The token binds exactly one `delegated_by` / `delegated_to` / `task_id` / `parent_task_id` tuple.
- A token MUST NOT be reused across multiple delegation events.
- When a task is escalated via `delegation.escalated`, the previous `handoff_token` is superseded and MUST NOT be accepted for operations on the escalated task.
- On `delegation.rejected`, any pending handoff token for that delegation is invalidated.

#### Future Profile Work

The following handoff token features are reserved for future security profiles and are NOT part of the current `harmovela.runtime-semantics.v1` specification:

- **Cryptographic signature:** The `sig` claim for token authenticity verification (`harmovela.security.v2`).
- **Revocation list:** A token revocation endpoint or event for invalidating tokens before expiry (`harmovela.security.v2`).
- **Audience restriction:** An `aud` claim restricting which runtimes may accept the token (`harmovela.security.v2`).
- **Token chaining:** Linking handoff tokens across a delegation chain for end-to-end provenance (`harmovela.coordination.v2`).

## Interruption And Cancellation Safety

### Fields

| Field | Type | Description |
|---|---|---|
| `checkpoint_id` | string | Identifier for saved execution state |
| `checkpoint_at` | RFC 3339 | Timestamp when the checkpoint was saved |
| `interruption_policy` | string | `"save_and_stop"`, `"drain_then_stop"`, `"force_stop"` |
| `compensation_id` | string | Links a compensation task to the task it compensates for |

### Events

#### Interruption Lifecycle

```
interruption.requested
      │
      ▼
interruption.acknowledged
      │
      ├──▶ interruption.saved ──▶ (later) interruption.resumed ──▶ task.progress
      │
      └──▶ interruption.cancelled
```

#### `interruption.requested`

```json
{
  "type": "interruption.requested",
  "task_id": "task_01",
  "interruption_policy": "save_and_stop",
  "payload": {
    "reason": "maintenance window approaching",
    "grace_period_ms": 5000
  }
}
```

#### `interruption.acknowledged`

```json
{
  "type": "interruption.acknowledged",
  "task_id": "task_01",
  "interruption_policy": "save_and_stop"
}
```

#### `interruption.saved`

```json
{
  "type": "interruption.saved",
  "task_id": "task_01",
  "checkpoint_id": "ckpt_task_01_20260710_100500",
  "checkpoint_at": "2026-07-10T10:05:00Z",
  "payload": {
    "bytes_saved": 4096,
    "location": "s3://checkpoints/task_01/ckpt_20260710_100500"
  }
}
```

#### `interruption.resumed`

```json
{
  "type": "interruption.resumed",
  "task_id": "task_01",
  "checkpoint_id": "ckpt_task_01_20260710_100500",
  "causation_id": "evt_interruption_saved"
}
```

#### `interruption.cancelled`

Emitted when an interrupted task is terminated rather than resumed.

```json
{
  "type": "interruption.cancelled",
  "task_id": "task_01",
  "causation_id": "evt_interruption_requested",
  "payload": {
    "reason": "maintenance extended; task will be recreated",
    "checkpoint_id": "ckpt_task_01_20260710_100500"
  }
}
```

#### Compensation Events

#### `compensation.requested`

```json
{
  "type": "compensation.requested",
  "task_id": "task_comp_01",
  "compensation_id": "task_original_01",
  "payload": {
    "original_task": "task_01",
    "reason": "partial effects must be rolled back",
    "description": "Delete any files created during the aborted indexing run",
    "deadline": "2026-07-10T11:00:00Z"
  }
}
```

#### `compensation.completed`

```json
{
  "type": "compensation.completed",
  "task_id": "task_comp_01",
  "compensation_id": "task_original_01",
  "payload": {
    "files_deleted": 14,
    "bytes_reclaimed": 204800
  }
}
```

### Normative Requirements

- On `interruption.requested` with policy `save_and_stop`, the task MUST create a checkpoint, emit `interruption.saved`, and stop within the grace period.
- On `interruption.requested` with policy `drain_then_stop`, the task SHOULD finish its current unit of work before saving and stopping.
- On `interruption.requested` with policy `force_stop`, the task MUST stop as soon as possible. Checkpoints are OPTIONAL but RECOMMENDED.
- Recovery after `interruption.resumed` MUST use the `checkpoint_id` to locate saved state. If the checkpoint is unavailable, the task MUST re-emit `task.failed` with a `checkpoint_missing` error code.
- `compensation_id` MUST reference the original `task_id` of the task whose side effects need reversal. Compensation tasks MUST follow the standard task lifecycle.

## Provenance

### Fields

| Field | Type | Description |
|---|---|---|
| `evidence_chain` | array of objects with `source` (string) and `id` (string) | Ordered list of events and sources that contributed to this assertion, from origin to immediate predecessor |
| `source_trust` | string | `"verified"`, `"attested"`, `"unverified"`, `"signed"` |
| `attestation_count` | number | Number of independent verifications of this assertion |
| `data_provenance` | URI | Link to a machine-readable provenance document |

The `evidence_chain` field extends `causation_id` (which identifies only the single immediately preceding event) into a multi-hop lineage:

```json
{
  "evidence_chain": [
    {"source": "sensor:temperature_a", "id": "evt_raw_reading"},
    {"source": "agent:analytics", "id": "evt_aggregated"},
    {"source": "agent:reporter", "id": "evt_current_assertion"}
  ],
  "causation_id": "evt_aggregated"
}
```

### Events

#### `provenance.attestation.added`

```json
{
  "type": "provenance.attestation.added",
  "causation_id": "evt_original_assertion",
  "payload": {
    "attestor": "agent:verifier",
    "method": "cross_reference",
    "result": "confirmed"
  }
}
```

#### `provenance.attestation.revoked`

```json
{
  "type": "provenance.attestation.revoked",
  "causation_id": "evt_attestation_added",
  "payload": {
    "attestor": "agent:verifier",
    "reason": "cross-reference source has been retracted"
  }
}
```

#### `provenance.chain.truncated`

Emitted when a runtime detects that earlier links in an evidence chain are no longer available (e.g., due to retention policy).

```json
{
  "type": "provenance.chain.truncated",
  "causation_id": "evt_original_assertion",
  "payload": {
    "earliest_available": "evt_aggregated",
    "missing_from": "evt_raw_reading",
    "reason": "events before 2026-07-01 have been purged per retention policy"
  }
}
```

### Normative Requirements

- `evidence_chain` MUST be read as a time-ordered list from origin (earliest) to most recent. The last entry MUST be the immediate predecessor (`causation_id`).
- Assertions with `source_trust: "unverified"` MUST be treated as provisional. Consumers MUST NOT make irreversible decisions based solely on unverified assertions.
- `source_trust: "signed"` MAY be verified through the identity and authorization mechanisms outlined in `docs/protocol/security.md`.
- When `provenance.chain.truncated` arrives, consumers that relied on the missing portion SHOULD assess whether their conclusions remain valid. If not, they SHOULD treat the affected assertion as `belief_status: "unknown"`.
- `attestation_count` increments with each `provenance.attestation.added` and effectively decrements with each `provenance.attestation.revoked`. Consumers SHOULD NOT use it as a sole trust signal without considering attestor identity.

## Relationship To Other Specs

| Spec | Relationship |
|---|---|
| `task-lifecycle.md` | Delegation, interruption, and compensation events compose with the task state machine |
| `session.md` | Session close SHOULD trigger interruption with policy `save_and_stop` for all active tasks |
| `subscription.md` | Consumers MAY subscribe to `belief.*`, `freshness.*`, `delegation.*`, `interruption.*`, `compensation.*`, and `provenance.*` |
| `delivery.md` | Checkpoint events SHOULD use `at_least_once` delivery |
| `security.md` | `source_trust: "signed"` verification and `handoff_token` validation MAY require identity/auth metadata |
| `error-model.md` | Error payloads for delegation rejection, interruption failure, and provenance verification failure MUST follow the standard error model |

## Field Summary

| Domain | Fields Added |
|---|---|
| Epistemic | `belief_status`, `belief_scope`, `confidence` |
| Freshness | `valid_from`, `valid_until`, `stale_after`, `refresh_hint` |
| Delegation | `delegated_by`, `delegated_to`, `parent_task_id`, `handoff_token` |
| Interruption | `checkpoint_id`, `checkpoint_at`, `interruption_policy`, `compensation_id` |
| Provenance | `evidence_chain`, `source_trust`, `attestation_count`, `data_provenance` |

All fields are optional envelope properties. All event types follow the `domain.object.action` naming convention. No existing required fields or event types change.

## Payload Schemas

Structured payload validation is defined in the shared payloads schema:

`schemas/harmovela-payloads.schema.json` (`https://schemas.axisrobo.com/harmovela-payloads.v0.1.schema.json`)

The schema uses `if`/`then` discriminator blocks keyed on the envelope `type` field to validate payloads for the following event types:

| Family | Validated types |
|---|---|
| Context | `context.invalidated`, `context.updated`, `context.snapshot.requested`, `context.snapshot.ready` |
| Memory | `memory.fact.invalidated`, `memory.fact.added`, `memory.fact.updated` |
| Belief | `belief.revised`, `belief.conflict.detected` |
| Freshness | `freshness.expired`, `freshness.window.changed` |
| Delegation | `delegation.requested`, `.accepted`, `.rejected`, `.handoff.completed`, `.escalated` |
| Interruption | `interruption.requested`, `.acknowledged`, `.saved`, `.resumed`, `.cancelled` |
| Compensation | `compensation.requested`, `.completed` |
| Provenance | `provenance.attestation.added`, `.revoked`, `.chain.truncated` |

Conformance tests in TypeScript and Python validate payloads against this schema.
