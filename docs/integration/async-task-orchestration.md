# Async Task Orchestration

> Status: draft. Part of the Harmovela 0.4 Beta integration scenarios.

## Narrative

An autonomous agent submits a long-running tool task (e.g. code analysis across a large repository), receives incremental progress and partial output events, may encounter a dependency block, and ultimately reaches a terminal state (completed, failed, cancelled, or timed out). In a multi-agent setting, the task may be delegated to a worker, escalated to a supervisor, or cancelled with child-task propagation.

## Coordination Dimensions

Task, Delegation, Recovery

## Scenario A: Single-Agent Task Lifecycle (Happy Path)

### Step-by-Step Event Sequence

| Step | Actor | Action | Event Type | Envelope Details |
|------|-------|--------|------------|------------------|
| 1 | Agent | Opens session with `agent:lifecycle` identity | `session.opened` | `source: "agent:lifecycle"`, `target: "harness:aep"` |
| 2 | Agent | Subscribes to `task.*` and `session.*` types | `subscription.requested` | `payload.types: ["task.*", "session.*"]` |
| 3 | Agent | Submits a task for code analysis | `task.submitted` | `task_id: "task_lc"`, `causation_id` points to subscription |
| 4 | Worker | Accepts the task and enqueues it | `task.accepted` | `source: "tool:worker"`, `target: "agent:lifecycle"`, `payload.state: "accepted"` |
| 5 | Worker | Begins execution | `task.started` | `payload.state: "started"`, `causation_id` references acceptance |
| 6 | Worker | Reports incremental progress at 50% | `task.progress` | `payload.progress: 0.5`, `payload.message: "Working on task"` |
| 7 | Worker | Completes the task with result | `task.completed` | `payload.state: "completed"`, `payload.result: "complete"` |
| 8 | Harness | Sends heartbeat to maintain session | `session.heartbeat` | `source: "harness:aep"`, `session_id: "sess_lifecycle"` |

### Scene B: Task Blocked And Resumed

| Step | Actor | Action | Event Type | Notes |
|------|-------|--------|------------|-------|
| 1-4 | Agent/Worker | Submit, accept, start | `task.submitted` → `task.accepted` → `task.started` | Standard initiation |
| 5 | Worker | Encounters a dependency; blocks | `task.blocked` | `payload.state: "blocked"` |
| 6 | Worker | Dependency resolves; resumes | `task.started` | Transition from BLOCKED back to STARTED |
| 7 | Worker | Reports resumed progress | `task.progress` | Progress event after resume |
| 8 | Worker | Completes task | `task.completed` | Final terminal state |

### Scene C: Two-Phase Cancellation

| Step | Actor | Action | Event Type | Notes |
|------|-------|--------|------------|-------|
| 1-4 | Agent/Worker | Submit, accept, start | `task.submitted` → `task.accepted` → `task.started` | Standard initiation |
| 5 | Consumer | Requests cancellation | `task.cancel.requested` | Distinct from `task.cancelled` |
| 6 | Producer | Confirms cancellation after cleanup | `task.cancelled` | Terminal state; no further events accepted |

### Scene D: Delegation, Escalation, and Cancellation Propagation (Multi-Agent)

| Step | Actor | Action | Event Type | Notes |
|------|-------|--------|------------|-------|
| 1 | Orchestrator | Submits ownership-transfer parent task | `task.submitted` | `task_id: "task_own"` |
| 2 | Planner | Requests delegation to worker | `delegation.requested` | `delegated_by: "agent:planner"`, `delegated_to: "agent:worker"`, `parent_task_id: "task_own"` |
| 3 | Worker | Accepts delegation | `delegation.accepted` | Confirms willingness to take ownership |
| 4 | Planner | Completes handoff with token | `delegation.handoff.completed` | `handoff_token: "ht_own_001"` — ownership transfer atomic |
| 5 | Orchestrator | Submits a task requiring escalation | `task.submitted` | `task_id: "task_esc"` |
| 6 | Planner | Delegates to worker | `delegation.requested` | `task_id: "task_esc_child"` |
| 7 | Planner | Escalates to supervisor (worker not reached) | `delegation.escalated` | `delegated_to: "agent:supervisor"`, `reason: "task exceeds worker capability"` |
| 8 | Orchestrator | Submits parent task for cancellation propagation test | `task.submitted` | `task_id: "task_parent"` |
| 9 | Planner | Accepts and starts parent | `task.accepted` → `task.started` | Standard initiation |
| 10 | Planner | Spawns child task | `task.submitted` | `task_id: "task_child"`, `payload.parent_task_id: "task_parent"` |
| 11 | Orchestrator | Cancels parent | `task.cancelled` | `payload.reason: "parent cancelled by user"` |
| 12 | Planner | Propagates cancellation to child | `task.cancelled` | `causation_id` references parent cancellation, `payload.reason: "parent task cancelled"` |

### Invalid Sequences (Rejected)

| Step | Actor | Action | Event Type | Rejection Reason |
|------|-------|--------|------------|------------------|
| — | Worker | Attempts `task.completed` from ACCEPTED (skipping STARTED) | `task.completed` | Illegal state transition; harness rejects |
| — | Worker | Cancels a completed task | `task.cancelled` | Terminal state violation; harness rejects |
| — | Planner | Escalates after delegation was rejected | `delegation.escalated` | Escalation only valid while delegation is active |
| — | Any | Cancels a child task before parent cancellation | `task.cancelled` | Propagation order violation |

## Expected Outcomes

1. **Happy path (Scene A):** All seven events are accepted by the harness. The task reaches `COMPLETED` terminal state. Subscription matches route events to the agent.
2. **Blocked/resumed (Scene B):** The `BLOCKED → STARTED` transition is accepted as a valid non-terminal transition. Events between block and resume (progress) are accepted.
3. **Cancellation (Scene C):** The two-phase `cancel.requested → cancelled` protocol completes correctly. Post-cancellation events are rejected.
4. **Delegation (Scene D):** Delegation flows (`requested → accepted → handoff.completed`) are accepted. Escalation is accepted while delegation is active. Cancellation propagation from parent to child is accepted.
5. **Invalid sequences:** Illegal transitions (`ACCEPTED → COMPLETED`), post-terminal cancellation, and post-rejection escalation are all rejected with appropriate error codes.

## Conformance Fixtures That Verify This Behavior

| Fixture | Level | Scenario Covered |
|---------|-------|-----------------|
| `conformance/fixtures/task-lifecycle.ndjson` | HARMOVELA-C1 | Scenes A (submitted → accepted → started → progress → completed) |
| `conformance/fixtures/core-lifecycle.ndjson` | HARMOVELA-C1 | Scenes A (session open, subscription, full task lifecycle, heartbeat) |
| `conformance/fixtures/task-blocked-resume.ndjson` | HARMOVELA-C1 | Scene B (blocked → started → progress → completed) |
| `conformance/fixtures/task-cancelled.ndjson` | HARMOVELA-C1 | Scene C direct cancellation (cancelled terminal state) |
| `conformance/fixtures/task-cancel-requested.ndjson` | HARMOVELA-C1 | Scene C two-phase cancellation protocol |
| `conformance/fixtures/task-failed.ndjson` | HARMOVELA-C1 | Task failure terminal state |
| `conformance/fixtures/task-timed-out.ndjson` | HARMOVELA-C1 | Task timeout terminal state |
| `conformance/fixtures/task-output.ndjson` | HARMOVELA-C1 | Partial output (OUTPUT state) and output→completed transition |
| `conformance/fixtures/task-invalid-transitions.ndjson` | HARMOVELA-C0 | Scene invalid sequences (illegal transitions rejected) |
| `conformance/fixtures/delegation-positive.ndjson` | HARMOVELA-C1 | Scene D (ownership transfer, escalation, cancellation propagation) |
| `conformance/fixtures/delegation-negative.ndjson` | HARMOVELA-C1 | Scene D invalid sequences (post-rejection escalation, post-completion cancellation) |

## Code References

| File | Description |
|------|-------------|
| `examples/quickstart/runtime-embed.*` | Minimal in-process runtime: create service, subscribe, publish, receive task events |
| `examples/service-client/emit-subscribe.js` | WebSocket client: emit a task event and subscribe to receive it |
| `examples/service-client/http-subscribe.js` | HTTP API client: create subscription, publish event, long-poll for delivery |

## Related Specifications

- `docs/protocol/task-lifecycle.md` — full task state machine and lifecycle events
- `docs/protocol/agent-runtime-semantics.md` — delegation, handoff, escalation semantics
- `docs/protocol/delivery.md` — ack protocol, at-least-once and at-most-once semantics
- `docs/protocol/reliability.md` — retry policy, dead-letter, durability
- `docs/protocol/profiles.md` — coordination profile (L2 multi-agent) declaration
