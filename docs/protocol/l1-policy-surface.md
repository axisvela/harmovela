# Harmovela L1 Advisory Policy Surface

> Status: draft. Adopted as part of the 0.1 Transition. Forwards to L3 enforcement.

## Purpose

Define the advisory policy surface an L1 implementer must supply for bounded autonomous task agents. At L1, a bounded agent operates within declared limits — cost, time, action count, allowed actions, and termination conditions — but the protocol does not yet enforce these limits, emit violation events, or provide portable authority semantics. That enforcement is the L3 Adaptation-layer goal (releases 0.5–1.0).

Until L3, the policy surface is **advisory**: it documents what a conformant L1 implementer must declare, negotiate, and respect. Implementers that declare a policy and then exceed it are non-conformant, but the protocol will not halt, quarantine, or revoke their session. This keeps L1 lightweight while making the autonomy boundary a documented contract rather than an assumption.

## Scope

An L1 agent is a **bounded autonomous task agent** under the [Harmovela autonomy ladder](../roadmap.md#autonomy-ladder). It may autonomously accept tasks, execute work, and produce events, but only within the boundaries declared at session negotiation.

The L1 policy surface covers:

| Policy dimension | Description | Declared in |
| --- | --- | --- |
| Budget limits | Maximum cost, wall-clock time, and action count per task or session | `capabilities.budget` |
| Timeout policy | Default operation timeouts and per-task overrides | `capabilities.timeouts` |
| Allowed actions | The set of event families, tool actions, and domains the agent may use | `capabilities.allowed_actions` |
| Termination conditions | When the agent must stop work and report status | `capabilities.termination` |
| Negotiation | How policy bounds are declared, merged, and agreed during session setup | `capabilities.negotiation` |

Each dimension surfaces during `session.ready` capability negotiation.

## Budget Limits

An L1 agent must declare resource budgets so that autonomy is bounded by cost, not by hope.

### Declared Budget

```json
{
  "capabilities": {
    "budget": {
      "max_cost_usd_millicents": 100000,
      "max_duration_ms": 300000,
      "max_actions": 50,
      "scope": "per_task"
    }
  }
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `max_cost_usd_millicents` | number | no | Maximum cost in thousandths of a cent (e.g., `100000` = USD 1.00). Absent means no cost limit. |
| `max_duration_ms` | number | no | Maximum wall-clock time in milliseconds for the scoped unit. Absent means no time limit. |
| `max_actions` | number | no | Maximum discrete actions (tool calls, events emitted, memory operations) for the scoped unit. Absent means no action-count limit. |
| `scope` | string | yes | `per_task` or `per_session`. `per_task` resets the counter per delegated task; `per_session` enforces a lifetime cap. |

At L1, exceeding a budget is **advisory non-conformance**. The agent should self-terminate the task with `task.failed` (code `budget_exceeded`), but the runtime will not enforce this.

### Budget Exhaustion Event

When an L1 agent voluntarily exceeds its declared budget, it should emit:

```json
{
  "type": "task.failed",
  "payload": {
    "task_id": "task_01",
    "error": {
      "code": "budget_exceeded",
      "message": "task exceeded declared max_actions budget of 50",
      "retryable": false,
      "details": {
        "budget_dimension": "max_actions",
        "declared": 50,
        "consumed": 54
      }
    }
  }
}
```

## Timeout Policy

Every L1 operation governed by autonomy must have a declared timeout. Without a timeout, a task is not bounded.

### Default Timeouts

```json
{
  "capabilities": {
    "timeouts": {
      "default_task_timeout_ms": 120000,
      "default_action_timeout_ms": 30000,
      "default_idle_timeout_ms": 60000,
      "heartbeat_interval_ms": 15000
    }
  }
}
```

| Field | Default | Description |
| --- | --- | --- |
| `default_task_timeout_ms` | 120000 (2 min) | Maximum time a task may run before the agent should self-terminate. |
| `default_action_timeout_ms` | 30000 (30 s) | Maximum time a single tool call or action may take. |
| `default_idle_timeout_ms` | 60000 (1 min) | Maximum time an agent may be idle before the session should be considered stale. |
| `heartbeat_interval_ms` | 15000 (15 s) | Standard session heartbeat interval (also declared in `capabilities.heartbeat_interval_ms`). |

### Per-Task Override

An individual task may override the defaults in its `task.submitted` payload:

```json
{
  "type": "task.submitted",
  "payload": {
    "task_id": "task_01",
    "deadline_ms": 180000,
    "action_timeout_ms": 60000
  }
}
```

Per-task timeouts override defaults for that task only. When both `max_duration_ms` (budget) and `deadline_ms` (timeout) are present, the tighter bound applies.

## Allowed Actions

An L1 agent must declare what it is allowed to do. Without an allowed-action declaration, an L1 agent is assumed to have **no actions permitted** — it may only send lifecycle events.

### Action Allowlist

```json
{
  "capabilities": {
    "allowed_actions": {
      "event_families": ["task.*", "session.*", "event.*", "memory.*", "context.*"],
      "tool_domains": ["tool:web_crawler", "tool:code_analysis"],
      "target_identities": ["agent:supervisor", "harness:harmovela"],
      "max_concurrent_tasks": 3
    }
  }
}
```

| Field | Type | Description |
| --- | --- | --- |
| `event_families` | string[] | Event type families the agent may emit (glob patterns). Absent means no events permitted (except `session.*` lifecycle). |
| `tool_domains` | string[] | Tool source identities the agent may invoke. Absent means no tool actions permitted. |
| `target_identities` | string[] | Agents or harness identities the agent may target. Absent means only broadcast events. |
| `max_concurrent_tasks` | number | Maximum tasks the agent may process concurrently. Default `1`. |

### Action Blocklist

An implementer may also declare an explicit blocklist to carve out restricted actions from an otherwise broad allowlist:

```json
{
  "capabilities": {
    "allowed_actions": {
      "event_families": ["*"],
      "blocklisted_families": ["governance.*", "delegation.*"],
      "blocklisted_tools": ["tool:system_admin"]
    }
  }
}
```

When both an allowlist and a blocklist are present, the blocklist takes precedence.

## Termination Conditions

An L1 agent must declare the conditions under which it will terminate work, so that consumers know when to expect a terminal event and when to escalate.

### Termination Declaration

```json
{
  "capabilities": {
    "termination": {
      "on_budget_exhausted": "fail",
      "on_timeout": "fail",
      "on_unrecoverable_error": "fail",
      "on_cancellation_requested": "cancel",
      "on_session_closed": "fail",
      "grace_period_ms": 5000
    }
  }
}
```

| Field | Default | Description |
| --- | --- | --- |
| `on_budget_exhausted` | `"fail"` | Behavior when budget is exhausted: `fail`, `cancel`, or `escalate`. |
| `on_timeout` | `"fail"` | Behavior when a task or action timeout is reached: `fail`, `cancel`, or `escalate`. |
| `on_unrecoverable_error` | `"fail"` | Behavior on an error the agent cannot recover from: `fail` or `escalate`. |
| `on_cancellation_requested` | `"cancel"` | Behavior when cancellation is requested: `cancel` or `ignore`. |
| `on_session_closed` | `"fail"` | Behavior when the session closes mid-task: `fail`, `cancel`, or `continue` (checkpoint and resume on reconnect). |
| `grace_period_ms` | 5000 | Time the agent has to flush events and transition to terminal state after a termination condition is met. |

### Termination Events

Each termination behavior maps to a task lifecycle event:

| Behavior | Event | Meaning |
| --- | --- | --- |
| `fail` | `task.failed` | Task stopped with an error. May be retried. |
| `cancel` | `task.cancelled` | Task stopped by request. Not retriable. |
| `escalate` | `task.escalated` | Task handed off to a supervisor or dead-letter. |
| `ignore` | (none) | Agent ignores the condition. Non-conformant at L1 unless explicitly declared in capabilities. |
| `continue` | (none) | Agent checkpoints and resumes on reconnect. Requires `replayable` delivery mode. |

## Negotiation

L1 policy is negotiated during `session.ready`. Both the bounded agent (the consumer of tasks) and the delegating agent (the producer of tasks) may declare their expected policy surface. The negotiated policy is the intersection of declared capabilities.

### Negotiation Flow

1. **Bounded agent** declares its policy in `session.ready.capabilities` — what it is willing and able to respect.
2. **Delegating agent** (or harness) declares its expected minimum policy in `session.ready.capabilities.budget`, `capabilities.timeouts`, `capabilities.allowed_actions`, and `capabilities.termination`.
3. The **effective policy** is the stricter of the two declarations for each dimension.
4. If the bounded agent cannot meet the delegating agent's minimum, the session should not reach `READY` — the delegating agent should reject the session.

### Example: Negotiated Budget

```json
{
  "type": "session.ready",
  "payload": {
    "capabilities": {
      "budget": {
        "max_duration_ms": 300000,
        "max_actions": 50,
        "scope": "per_task",
        "negotiation_mode": "stricter_wins"
      }
    }
  }
}
```

| Field | Description |
| --- | --- |
| `negotiation_mode` | Must be `"stricter_wins"` at L1. The tighter bound (shorter timeout, lower action count) is the effective policy. |

## L1 → L3 Forward Path

| Aspect | L1 (advisory) | L3 (enforced) |
| --- | --- | --- |
| Budget enforcement | Agent self-reports violation | Runtime enforces and blocks further actions |
| Violation events | `task.failed` with `budget_exceeded` | `policy.violated` with audit trail |
| Authority to modify policy | Declared, not verified | Cryptographic authority and delegation chain |
| Cross-agent budget propagation | Not defined | Budget tracking across delegation trees |
| Conformance testing | Advisory: fixture checks declaration shape | Enforced: fixture halts session on violation |
| Quarantine / revocation | Not defined | Runtime may quarantine or revoke agent credentials |

The L1 advisory surface defines the shape of the L3 enforced surface. Implementers who adopt the L1 declarations now will have a straightforward migration path when L3 enforcement becomes available.

## Implementation Notes

- All policy fields are optional. An L1 agent that declares no policy is conformant but declares unbounded autonomy — consumers should treat such agents with caution.
- The `capabilities` object in `session.ready` may carry these policy fields in addition to the standard protocol capabilities defined in [session.md](./session.md).
- Policy declarations are **capability declarations**, not configuration. An agent that declares `max_actions: 50` and subsequently performs 51 actions is non-conformant, even though the protocol will not intervene at L1.
- Per-task overrides in `task.submitted.payload` take precedence over session-level defaults.
- The `budget_exceeded` error code is reserved for L1 voluntary reporting and L3 enforcement.
