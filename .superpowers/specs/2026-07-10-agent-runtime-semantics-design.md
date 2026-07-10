# Agent Runtime Semantics — Design

> Status: approved design. See `docs/specs/agent-runtime-semantics.md` for the normative spec.

**Goal:** Define recommended AEP envelope metadata fields and event types for agent-runtime concerns that the differentiation analysis identified as future specification work: belief revision, freshness/validity, delegation/handoff, interruption/cancellation safety, and provenance/trust.

## Architecture

All additions are optional recommended envelope fields (not breaking the current `additionalProperties: true` envelope schema) and new event types in existing event families. No new mandatory protocol requirement. Each semantic domain defines:

- Recommended envelope metadata fields
- New event types (if any)
- Consumer behavioral contracts ("should", not "must")

Five domains, sequenced as a single spec document:

### 1. Epistemic Metadata

Fields: `belief_status`, `belief_scope`, `confidence`
Events: `belief.revised`, `belief.conflict.detected`

Describes how an agent annotates the epistemic status of its assertions. Integrates with `memory.fact.invalidated`, `context.invalidated` to guide revision.

### 2. Freshness & Validity

Fields: `valid_from`, `valid_until`, `stale_after`, `refresh_hint`
Events: `freshness.expired`, `freshness.window.changed`

Distinct from `expires_at` (which governs event delivery lifetime). Describes when the *asserted content* becomes stale, regardless of whether the event is still deliverable.

### 3. Delegation & Handoff

Fields: `delegated_by`, `delegated_to`, `parent_task_id`, `handoff_token`
Events: `delegation.requested`, `.accepted`, `.rejected`, `.handoff.completed`, `.escalated`

Models task ownership transfer and parent-child task relationships. Composes with the existing task lifecycle spec.

### 4. Interruption & Cancellation Safety

Fields: `checkpoint_id`, `checkpoint_at`, `interruption_policy`, `compensation_id`
Events: `interruption.requested`, `.acknowledged`, `.saved`, `.resumed`, `.cancelled`; `compensation.requested`, `.completed`

Extends the existing task cancellation events with checkpoint/resume and compensation semantics.

### 5. Provenance & Trust

Fields: `evidence_chain`, `source_trust`, `attestation_count`, `data_provenance`
Events: `provenance.attestation.added`, `.revoked`, `.chain.truncated`

Goes beyond `causation_id` (direct parent) to multi-hop evidence chains and source trust annotations.

## Totals

| Artifact | Count |
| --- | --- |
| New recommended envelope fields | 15 |
| New event types | 18 |
| Breaking protocol changes | 0 |

All fields are optional and fall under the existing `additionalProperties: true` schema. All event types follow the dotted `domain.object.action` naming convention from `docs/protocol-design.md`.
