# Harmovela Adaptation Feedback Specification

> Status: draft. Part of the 0.5 Adaptation Preview.

## Purpose

Define the feedback and outcome event family that correlates each completed outcome to its originating task, goal, delegation chain, authority, and declared and consumed cost. These events make the results of coordinated work first-class and observable so the system can reason about its own performance.

Adaptation feedback builds on the [event contract](event-contract.md) and the [coordination profile](profiles.md#coordination-profile-l2-multi-agent-collaboration-and-delegation). It does not duplicate envelope, session, subscription, or task-lifecycle semantics.

## Ownership

Governance owns the adaptation event family (`adaptation.*`). Feedback and budget events share the same family prefix and are subject to the authorization and audit boundaries defined in the [governance contract](governance-contract.md) and the [adaptation profile](profiles.md#adaptation-profile-l3-production-autonomy).

## Event Types

### `adaptation.outcome.correlated`

Emitted when an outcome (a completed, failed, cancelled, or timed-out task) has been correlated to its upstream context. This event ties the result of work back to the goal, delegation chain, authority, and cost that produced it.

```json
{
  "type": "adaptation.outcome.correlated",
  "id": "evt_adapt_corr_01",
  "source": "harness:adaptation",
  "created_at": "2026-07-14T10:30:00Z",
  "payload": {
    "task_id": "task_01",
    "task_outcome": "completed",
    "goal_id": "goal_ping_cycle_01",
    "goal_description": "Verify service connectivity every 60s",
    "delegation_chain": [
      { "agent_id": "agent:supervisor", "role": "delegator" },
      { "agent_id": "agent:pinger",    "role": "delegate" }
    ],
    "authority": {
      "issuer": "agent:supervisor",
      "capability": "delegation.own",
      "granted_at": "2026-07-14T10:00:00Z"
    },
    "cost": {
      "declared": {
        "max_cost_usd_millicents": 100000,
        "max_duration_ms": 300000,
        "max_actions": 50
      },
      "consumed": {
        "cost_usd_millicents": 12500,
        "duration_ms": 28000,
        "actions": 3
      }
    }
  }
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `payload.task_id` | string | yes | The correlated task identifier. |
| `payload.task_outcome` | string | yes | The terminal task state: `completed`, `failed`, `cancelled`, or `timed_out`. |
| `payload.goal_id` | string | no | The originating goal identifier, if the task was dispatched toward a declared goal. |
| `payload.goal_description` | string | no | Human-readable summary of the goal. |
| `payload.delegation_chain` | array | no | Ordered list of `{agent_id, role}` entries representing the delegation path, with the original delegator first. |
| `payload.authority` | object | no | The authority under which the task was executed. |
| `payload.authority.issuer` | string | yes if authority present | The agent that granted the authority. |
| `payload.authority.capability` | string | yes if authority present | The capability granted (e.g., `delegation.own`). |
| `payload.authority.granted_at` | string | yes if authority present | ISO 8601 timestamp of the grant. |
| `payload.cost.declared` | object | no | The budget limits declared for the task. Mirrors the `capabilities.budget` fields. |
| `payload.cost.consumed` | object | no | The actual resources consumed. |
| `payload.cost.consumed.cost_usd_millicents` | number | no | Actual cost in thousandths of a cent. |
| `payload.cost.consumed.duration_ms` | number | no | Actual wall-clock time spent. |
| `payload.cost.consumed.actions` | number | no | Actual discrete actions performed. |

### `adaptation.goal.achieved`

Emitted when a goal is evaluated and found to be achieved. A goal is achieved when all tasks dispatched toward it have reached a satisfactory terminal state.

```json
{
  "type": "adaptation.goal.achieved",
  "id": "evt_goal_ach_01",
  "source": "harness:adaptation",
  "created_at": "2026-07-14T14:00:00Z",
  "correlation_id": "goal_ping_cycle_01",
  "payload": {
    "goal_id": "goal_ping_cycle_01",
    "goal_description": "Verify service connectivity every 60s",
    "achievement_criteria": "all_tasks_completed",
    "completed_task_count": 5,
    "failed_task_count": 0,
    "task_ids": ["task_01", "task_02", "task_03", "task_04", "task_05"],
    "evaluated_at": "2026-07-14T14:00:00Z",
    "evaluator": "agent:supervisor"
  }
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `payload.goal_id` | string | yes | The achieved goal identifier. |
| `payload.goal_description` | string | no | Human-readable summary of the goal. |
| `payload.achievement_criteria` | string | yes | How achievement was determined: `all_tasks_completed`, `threshold_met`, or a custom criterion key. |
| `payload.completed_task_count` | number | yes | Number of tasks that reached a successful terminal state. |
| `payload.failed_task_count` | number | yes | Number of tasks that reached a failure terminal state. |
| `payload.task_ids` | string[] | yes | Identifiers of all tasks dispatched toward this goal. |
| `payload.evaluated_at` | string | yes | ISO 8601 timestamp of the evaluation. |
| `payload.evaluator` | string | yes | Identity of the evaluating agent. |

### `adaptation.goal.blocked`

Emitted when a goal cannot progress because a required precondition is not met, a dependency is unavailable, or a budget/authorization constraint prevents further work.

```json
{
  "type": "adaptation.goal.blocked",
  "id": "evt_goal_blk_01",
  "source": "harness:adaptation",
  "created_at": "2026-07-14T11:00:00Z",
  "correlation_id": "goal_backup_cycle_01",
  "payload": {
    "goal_id": "goal_backup_cycle_01",
    "goal_description": "Perform nightly backup to remote storage",
    "block_reason": "dependency_unavailable",
    "block_detail": "Remote storage endpoint unreachable after 3 retries",
    "blocked_task_ids": ["task_backup_01"],
    "resolution_hint": "retry_after",
    "retry_after_ms": 3600000,
    "blocked_at": "2026-07-14T11:00:00Z"
  }
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `payload.goal_id` | string | yes | The blocked goal identifier. |
| `payload.goal_description` | string | no | Human-readable summary of the goal. |
| `payload.block_reason` | string | yes | Reason for blocking: `dependency_unavailable`, `budget_exhausted`, `authorization_denied`, `precondition_unmet`, or a custom reason key. |
| `payload.block_detail` | string | no | Human-readable description of the block. |
| `payload.blocked_task_ids` | string[] | no | Identifiers of tasks that cannot proceed. |
| `payload.resolution_hint` | string | no | Suggested resolution: `retry_after`, `escalate`, `reauthorize`, `increase_budget`. |
| `payload.retry_after_ms` | number | no | Suggested wait time before retry, in milliseconds. |
| `payload.blocked_at` | string | yes | ISO 8601 timestamp when the block was detected. |

### `adaptation.cost.exceeded`

Emitted when the consumed cost for a task or goal exceeds the declared budget. This is the L3 enforced equivalent of the L1 advisory `task.failed` with `budget_exceeded`.

```json
{
  "type": "adaptation.cost.exceeded",
  "id": "evt_cost_exc_01",
  "source": "harness:adaptation",
  "created_at": "2026-07-14T10:32:00Z",
  "correlation_id": "task_01",
  "causation_id": "task_01",
  "payload": {
    "task_id": "task_01",
    "goal_id": "goal_ping_cycle_01",
    "exceeded_dimension": "max_actions",
    "declared": 50,
    "consumed": 54,
    "enforced": true,
    "enforcement_action": "task_failed",
    "exceeded_at": "2026-07-14T10:32:00Z"
  }
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `payload.task_id` | string | yes | The task that exceeded its cost budget. |
| `payload.goal_id` | string | no | The goal the task belongs to, if any. |
| `payload.exceeded_dimension` | string | yes | The budget dimension exceeded: `max_cost_usd_millicents`, `max_duration_ms`, or `max_actions`. |
| `payload.declared` | number | yes | The declared limit. |
| `payload.consumed` | number | yes | The actual consumption at the point of exceedance. |
| `payload.enforced` | boolean | yes | Whether the runtime enforced the limit (`true` at L3). |
| `payload.enforcement_action` | string | yes | What action the runtime took: `task_failed`, `task_cancelled`, `task_escalated`, `session_quarantined`. |
| `payload.exceeded_at` | string | yes | ISO 8601 timestamp of exceedance. |

## Correlation Model

All adaptation feedback events carry correlation metadata through the standard envelope:

| Envelope field | Usage |
| --- | --- |
| `correlation_id` | Links feedback events to the originating goal or batch. |
| `causation_id` | Links feedback events to the specific task or budget event that triggered them. |
| `source` | Set to `harness:adaptation` when emitted by the protocol runtime; set to the evaluating agent when emitted by an external evaluator. |

The correlation chain is: **goal → dispatched tasks → outcomes → correlated feedback**. Each `adaptation.outcome.correlated` event closes the loop by linking the outcome back to the goal. The consumer can then evaluate goal achievement through the `adaptation.goal.achieved` or `adaptation.goal.blocked` signals.

## Authorization and Audit

Adaptation feedback events are subject to the [security profile](security.md) authorization boundary. Consumers may only receive feedback events for tasks and goals within their authorized scope. Audit linkage for adaptation feedback events follows the same pattern as all other governance-audited events: actor identity, timestamp, affected resource, and granted authority.

Fee​dback events do not carry application payloads; they carry only the correlation and cost metadata defined above. Payload redaction does not apply.

## Dependencies

- [Event contract](event-contract.md) — envelope validation and routing.
- [Task lifecycle](task-lifecycle.md) — task terminal states that trigger outcome correlation.
- [Governance contract](governance-contract.md) — authorization checks for feedback visibility.
- [Security profile](security.md) — identity, authorization, audit boundaries.
- [Adaptation budget](adaptation-budget.md) — declared cost limits referenced in `adaptation.cost.exceeded`.
