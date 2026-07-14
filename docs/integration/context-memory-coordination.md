# Context and Memory Coordination

> Status: draft. Part of the Harmovela 0.4 Beta integration scenarios.

## Narrative

A memory system emits fact changes (additions, invalidations) and retrieval results while a context provider signals context invalidations (e.g. user navigated to a new page). An agent subscriber holds active subscriptions to both `memory.*` and `context.*` events and reacts as they arrive. Belief revision, freshness windows, and provenance attestations enrich the coordination with epistemic and temporal metadata.

## Coordination Dimensions

Event, State, Context / Memory

## Scenario A: Agent Subscribes to Memory and Context Events

### Step-by-Step Event Sequence

| Step | Actor | Action | Event Type | Envelope Details |
|------|-------|--------|------------|------------------|
| 1 | Agent | Opens a session | `session.opened` | `source: "agent:researcher"`, `session_id: "sess_01"` |
| 2 | Agent | Subscribes to `memory.*` and `context.*` types | `subscription.requested` | `payload.types: ["memory.*", "context.*"]`, `payload.target: "agent:researcher"`, `conversation_id: "conv_01"` |
| 3 | Context Provider | Signals that the current context is invalidated (e.g. user navigated away) | `context.invalidated` | `source: "context:main"`, `target: "agent:researcher"`, `payload.context_key: "memory_retrieval"`, `payload.reason: "memory update changed retrieval set"` |
| 4 | Memory System | Adds a new fact with source attribution | `memory.fact.added` | `source: "memory:main"`, `target: "agent:researcher"`, `payload.fact_id: "fact_01"`, `payload.value: "AEP is the event layer."`, `payload.source: "user_input"` |
| 5 | Agent | Acknowledges receipt of the fact | `event.acknowledged` | `source: "agent:researcher"`, `target: "memory:main"`, `causation_id: "evt_memory_001"`, `payload.acknowledged_event_id: "evt_memory_001"` |
| 6 | Context Provider | Reports that a new snapshot is ready (e.g. results page loaded) | `context.snapshot.ready` | `source: "context:browser"`, `payload.url: "/results"`, `payload.title: "Search Results"` |
| 7 | Non-matching Source | Sends a `task.progress` event the agent is NOT subscribed to | `task.progress` | `event.rejected` returned by harness — subscription filter mismatch |
| 8 | Memory System | Returns results for a retrieval query | `memory.retrieval.ready` | `source: "memory:main"`, retrieved facts delivered via subscription match |
| 9 | Memory System | Invalidates a previously recorded fact | `memory.fact.invalidated` | `payload.fact_id: "fact_01"`, `payload.reason: "source retracted"` |
| 10 | Agent | Closes the session | `session.closed` | Terminal session state |

### Subscription Matching Verification

| Incoming Event | Agent Subscribed? | Delivered? | Reason |
|----------------|------------------|------------|--------|
| `context.invalidated` | Yes (matches `context.*`) | Delivered | Type pattern match |
| `memory.fact.added` | Yes (matches `memory.*`) | Delivered | Type pattern match |
| `context.snapshot.ready` | Yes (matches `context.*`) | Delivered | Type pattern match |
| `task.progress` | No (not in `memory.*` or `context.*`) | Rejected | Subscription filter mismatch |
| `memory.retrieval.ready` | Yes (matches `memory.*`) | Delivered | Type pattern match |
| `memory.fact.invalidated` | Yes (matches `memory.*`) | Delivered | Type pattern match |

## Scenario B: Belief Revision, Freshness, and Provenance (Runtime Semantics)

### Step-by-Step Event Sequence

| Step | Actor | Action | Event Type | Notes |
|------|-------|--------|------------|-------|
| 1 | Agent | Discovers a prior belief was incorrect; publishes corrected state | `belief.revised` | `belief_status: "revised"`, `confidence: 0.95`, `payload.previous: "...Paris..."`, `payload.corrected: "...Berlin..."` |
| 2 | Observer | Detects conflicting claims from two sources | `belief.conflict.detected` | `belief_status: "contradicted"`, `payload.claims` with differing weather values |
| 3 | Runtime | Detects cached state has exceeded its `valid_until` window | `freshness.expired` | `causation_id` references cached snapshot, `payload.valid_until` is in the past |
| 4 | Provider | Shortens a validity window due to manual update | `freshness.window.changed` | `payload.previous_valid_until` earlier, `payload.new_valid_until` earlier still |
| 5 | Verifier | Attests to an assertion via cross-reference | `provenance.attestation.added` | `payload.attestor: "agent:verifier"`, `payload.method: "cross_reference"`, `payload.result: "confirmed"` |
| 6 | Verifier | Revokes a prior attestation (source retracted) | `provenance.attestation.revoked` | `causation_id` references the prior attestation |
| 7 | Runtime | Detects evidence chain truncated by retention policy | `provenance.chain.truncated` | `payload.earliest_available`, `payload.missing_from`, `payload.reason` |

## Scenario C: Delegation and Interruption (Recovery Dimension)

### Step-by-Step Event Sequence

| Step | Actor | Action | Event Type | Notes |
|------|-------|--------|------------|-------|
| 1 | Planner | Requests delegation to a worker | `delegation.requested` | `delegated_by: "agent:planner"`, `delegated_to: "agent:worker"` |
| 2 | Worker | Accepts delegation | `delegation.accepted` | Confirms ownership |
| 3 | Both | Handoff completes with token | `delegation.handoff.completed` | `handoff_token: "ht_abc123"` |
| 4 | Orchestrator | Requests interruption due to maintenance window | `interruption.requested` | `interruption_policy: "save_and_stop"`, `payload.grace_period_ms: 5000` |
| 5 | Worker | Acknowledges interruption request | `interruption.acknowledged` | `interruption_policy: "save_and_stop"` |
| 6 | Worker | Saves checkpoint before stopping | `interruption.saved` | `checkpoint_id: "ckpt_task_01_..."`, `checkpoint_at`, `payload.bytes_saved`, `payload.location` |
| 7 | Orchestrator | Later requests resume from checkpoint | `interruption.resumed` | `checkpoint_id` references saved checkpoint |
| 8 | Orchestrator | Requests compensation for partial effects | `compensation.requested` | `compensation_id` references original task, `payload.reason: "partial effects must be rolled back"` |
| 9 | Compensator | Completes compensation | `compensation.completed` | `payload.files_deleted: 14`, `payload.bytes_reclaimed: 204800` |

## Expected Outcomes

1. **Subscription matching (Scene A):** Events matching `memory.*` or `context.*` patterns are delivered; events matching neither (e.g. `task.progress`) are rejected with subscription filter mismatch. Acknowledgement via `event.acknowledged` is accepted.
2. **Fact lifecycle:** `memory.fact.added` followed by `memory.fact.invalidated` for the same fact is semantically coherent — consumers should mark dependent conclusions for re-evaluation on invalidation.
3. **Belief revision:** `belief.revised` carries corrected assertions with `causation_id` linking to the original. `belief.conflict.detected` surfaces contradictory claims for resolution.
4. **Freshness enforcement:** `freshness.expired` signals stale cached state; `freshness.window.changed` signals shortened validity windows. Consumers receiving either should not proceed with decisions based on the stale resource.
5. **Provenance traceability:** `provenance.attestation.added` increments trust; `provenance.attestation.revoked` decrements it. `provenance.chain.truncated` warns of missing lineage.
6. **Interruption and compensation:** Interruption lifecycle (`requested → acknowledged → saved → resumed`) preserves work. Compensation lifecycle (`requested → completed`) reverses partial side effects.

## Conformance Fixtures That Verify This Behavior

| Fixture | Level | Scenario Covered |
|---------|-------|-----------------|
| `conformance/fixtures/memory-context-ack.ndjson` | HARMOVELA-C0 | Scene A (subscription, memory.fact.added, context.invalidated, event.acknowledged) |
| `conformance/fixtures/event-core.ndjson` | HARMOVELA-C1 | Scene A (session open/ready, subscription request/create, routing, cancellation) |
| `conformance/fixtures/event-contract.ndjson` | HARMOVELA-C1 | Scene A (Event contract: validate, route, acknowledge) |
| `conformance/fixtures/agent-runtime-semantics.ndjson` | HARMOVELA-C0 (runtime-semantics profile) | Scene B (belief.revised, freshness.expired, delegation.requested/accepted/handoff.completed, interruption.requested/acknowledged/saved, compensation.requested, provenance.attestation.added) |
| `conformance/fixtures/reject-some-payload.ndjson` | HARMOVELA-C0 | Scene A (envelope-valid context.invalidated with payload rejected by shared schema) |
| `conformance/fixtures/core-lifecycle.ndjson` | HARMOVELA-C1 | Full session+subscription+task flow end-to-end |

## Code References

| File | Description |
|------|-------------|
| `examples/scenarios/agent-subscriber.js` | Agent subscribes to memory + context events, processes incoming events, handles rejection for unsubscribed types |
| `examples/scenarios/memory-producer.js` | Memory system produces fact, retrieval, preference, and invalidation events, routes them via subscription matching |

## Related Specifications

- `docs/protocol/subscription.md` — subscription model, filter matching, wildcard patterns
- `docs/protocol/session.md` — session lifecycle and state management
- `docs/protocol/event-registry-governance.md` — event type registry and family governance
- `docs/protocol/agent-runtime-semantics.md` — belief, freshness, delegation, interruption, provenance
- `docs/protocol/delivery.md` — acknowledgement protocol
- `docs/protocol/error-model.md` — standard error codes for rejections
- `docs/protocol/event-dimension-classification.md` — dimension ownership of event type families
