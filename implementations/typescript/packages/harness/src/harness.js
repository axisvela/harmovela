import { isStandardEventType, validateEnvelope, isValidBySchema, ErrorCode, errorPayload } from "@axisrobo/harmovela-event";
import { EventRouter, HarmovelaSession } from "@axisrobo/harmovela-event";
import { TaskTracker } from "@axisrobo/harmovela-task";
import { DeliveryTracker } from "@axisrobo/harmovela-recovery";
import { authorize } from "@axisrobo/harmovela-governance";
import { CONTEXT_MEMORY_EVENT_TYPES } from "@axisrobo/harmovela-context";
import { DELEGATION_EVENT_TYPES } from "@axisrobo/harmovela-delegation";
import { RECOVERY_EVENT_TYPES } from "@axisrobo/harmovela-recovery";
import { STATE_EVENT_TYPES } from "@axisrobo/harmovela-state";
import { TOOL_EVENT_TYPES } from "@axisrobo/harmovela-tool";
import { AGENT_EVENT_TYPES } from "@axisrobo/harmovela-agent";
import { ENVIRONMENT_EVENT_TYPES } from "@axisrobo/harmovela-environment";
import { ADAPTATION_EVENT_TYPES } from "@axisrobo/harmovela-adaptation";
import { COMMAND_EVENT_TYPES } from "@axisrobo/harmovela-command";
import { QUERY_EVENT_TYPES } from "@axisrobo/harmovela-query";
import { CAPABILITY_EVENT_TYPES } from "@axisrobo/harmovela-capability";

const LEGACY_DIMENSION_EVENT_TYPES = new Set([
  "event.acknowledged",
  "event.rejected",
  "event.redelivered",
  "event.replayed",
  "event.dead_lettered",
  "task.submitted",
  "task.accepted",
  "task.started",
  "task.blocked",
  "task.progress",
  "task.output",
  "task.completed",
  "task.failed",
  "task.cancel.requested",
  "task.cancelled",
  "task.timed_out",
  ...CONTEXT_MEMORY_EVENT_TYPES,
  ...DELEGATION_EVENT_TYPES,
  ...RECOVERY_EVENT_TYPES,
  ...STATE_EVENT_TYPES,
  ...TOOL_EVENT_TYPES,
  ...AGENT_EVENT_TYPES,
  ...ENVIRONMENT_EVENT_TYPES,
  ...ADAPTATION_EVENT_TYPES,
  ...COMMAND_EVENT_TYPES,
  ...QUERY_EVENT_TYPES,
  ...CAPABILITY_EVENT_TYPES,
]);

export function isLegacyDimensionEventType(type) {
  return LEGACY_DIMENSION_EVENT_TYPES.has(type);
}

export class HarmovelaHarness {
  constructor(options = {}) {
    this.source = options.source ?? "harness:harmovela";
    this.now = options.now ?? (() => new Date().toISOString());
    this.useSchemaValidation = options.useSchemaValidation ?? false;
    this._sequence = 0;
    this._subscriptions = new Map();
    this._tasks = new Map();
    this._commands = new Map();
    this._queries = new Map();
    this._router = new EventRouter();
    this._session = null;
    this.delivery = new DeliveryTracker(options.delivery);
    this._audit = [];
    this._budget = {};
    this._budgetLimits = {};

    this._setupRouter();
    this._setupDeliveryRouter();
  }

  get audit() { return this._audit; }

  get session() { return this._session; }
  get subscriptions() { return new Map(this._subscriptions); }
  get tasks() { return new Map(this._tasks); }

  _setupRouter() {
    this._router
      .on("capabilities.requested", (event) => this._handleCapabilitiesRequested(event))
      .on("subscription.requested", (event) => this._handleSubscriptionRequested(event))
      .on("subscription.cancelled", (event) => this._handleSubscriptionCancelled(event))
      .on("task.submitted", (event) => this._handleTaskSubmitted(event))
      .on("task.cancel.requested", (event) => this._handleTaskCancelRequested(event))
      .on((event) => event.type.startsWith("task.") && event.type !== "task.submitted" && event.type !== "task.cancel.requested", (event) => this._handleTaskEvent(event))
      .on("session.opened", (event) => this._handleSessionOpened(event))
      .on("session.closed", (event) => this._handleSessionClosed(event))
      .on((event) => event.type && event.type.startsWith("adaptation."), (event) => this._handleAdaptationEvent(event))
      .on("command.requested", (event) => this._handleCommandRequested(event))
      .on((event) => event.type && event.type.startsWith("command.") && event.type !== "command.requested", (event) => this._handleCommandLifecycle(event))
      .on("query.requested", (event) => this._handleQueryRequested(event))
      .on((event) => event.type && event.type.startsWith("query.") && event.type !== "query.requested", (event) => this._handleQueryLifecycle(event));
  }

  _setupDeliveryRouter() {
    this._router
      .on("event.acknowledged", (event) => this._handleInboundAck(event))
      .on("event.redelivered", (event) => this._handleInboundRedeliver(event))
      .on("event.dead_lettered", (event) => this._handleInboundDeadLetter(event));
  }

  handle(value) {
    const errors = validateEnvelope(value);
    if (errors.length > 0) {
      return [this._event("event.rejected", value, {
        errors,
        error: errorPayload(ErrorCode.INVALID_ENVELOPE, errors[0])
      })];
    }

    if (this.useSchemaValidation && !isValidBySchema(value, "envelope")) {
      return [this._event("event.rejected", value, {
        errors: ["schema validation failed"],
        error: errorPayload(ErrorCode.INVALID_ENVELOPE, "envelope does not conform to JSON Schema")
      })];
    }

    if (!isStandardEventType(value.type) && !isLegacyDimensionEventType(value.type)) {
      return [this._event("event.rejected", value, {
        errors: [`type not in standard draft registry: ${value.type}`],
        error: errorPayload(ErrorCode.INVALID_EVENT_TYPE, `unknown event type: ${value.type}`, { retryable: false })
      })];
    }

    if (value.spec_version !== "0.2") {
      return [this._event("event.rejected", value, {
        errors: [`unsupported protocol version: ${value.spec_version}`],
        error: errorPayload(ErrorCode.UNSUPPORTED_VERSION, `unsupported version ${value.spec_version}`, { details: { supported: ["0.2"] } })
      })];
    }

    if (value.actor_id && value.requested_action) {
      const decision = authorize({
        actor: {
          actorId: value.actor_id,
          tenantId: value.tenant_id,
          roles: value.roles ?? []
        },
        action: value.requested_action,
        targetTenant: value.target_tenant_id
      });
      this._audit.push({
        actor_id: value.actor_id,
        tenant_id: value.tenant_id,
        action: value.requested_action,
        target_tenant_id: value.target_tenant_id,
        allowed: decision.allowed,
        correlation_id: value.correlation_id,
        causation_id: value.causation_id
      });
      if (!decision.allowed) {
        return [this._event("event.rejected", value, {
          error: errorPayload(ErrorCode.UNAUTHORIZED, `governance denied: ${decision.reason}`)
        })];
      }
    }

    if (typeof value.budget_cost === "number" && value.budget_cost > 0) {
      const budgetId = value.budget_id;
      const tenantId = value.tenant_id;
      if (budgetId && tenantId) {
        const remaining = (this._budget[tenantId] && this._budget[tenantId][budgetId]) || 0;
        if (remaining < value.budget_cost) {
          this._audit.push({
            actor_id: value.actor_id,
            tenant_id: tenantId,
            action: "adaptation.budget.limit_exceeded",
            correlation_id: value.correlation_id,
            causation_id: value.causation_id,
            allowed: false,
          });
          return [
            this._event("event.rejected", value, {
              error: errorPayload(ErrorCode.BUDGET_EXCEEDED, `budget limit exceeded for ${budgetId}`),
            }),
            this._event("adaptation.budget.limit_exceeded", value, {
              budget_id: budgetId,
              tenant_id: tenantId,
              cost: value.budget_cost,
              remaining,
              limit: this._budgetLimits[budgetId],
            }),
          ];
        }
      }
    }

    if (value.delivery?.mode) {
      this.delivery.track(value.id, value.session_id ?? "_default");
    }

    const routed = this._router.dispatch(value);
    if (routed.length > 0) return routed;

    return [this._event("event.acknowledged", value, {
      acknowledged_event_id: value.id
    })];
  }

  _handleInboundAck(event) {
    const eventId = event.payload?.acknowledged_event_id;
    if (eventId) this.delivery.ack(eventId);
    return [this._event("event.acknowledged", event, {
      acknowledged_event_id: event.id
    })];
  }

  _handleInboundRedeliver(event) {
    const eventId = event.payload?.original_event_id;
    if (eventId) this.delivery.nack(eventId);
    return [this._event("event.acknowledged", event, {
      acknowledged_event_id: event.id
    })];
  }

  _handleInboundDeadLetter(event) {
    const eventId = event.payload?.original_event_id;
    if (eventId) {
      this.delivery.deadLetter(eventId, event.payload?.error ?? { code: "unknown" });
    }
    return [this._event("event.acknowledged", event, {
      acknowledged_event_id: event.id
    })];
  }

  _handleCapabilitiesRequested(event) {
    return this._event("capabilities.declared", event, {
      protocol: "harmovela",
      spec_version: "0.2",
      transports: ["stdio"],
      delivery_modes: ["best_effort", "at_least_once", "replayable"],
      features: [
        "envelope_validation",
        "event_type_registry",
        "subscription_matching",
        "session_lifecycle",
        "task_lifecycle",
        "error_model",
        "event_routing"
      ]
    });
  }

  _handleSubscriptionRequested(event) {
    const payload = event.payload ?? {};
    const subscriptionId = `sub_${String(++this._sequence).padStart(4, "0")}`;

    if (!payload.types && !payload.source && !payload.target && !payload.topic) {
      return this._event("subscription.rejected", event, {
        subscription_id: subscriptionId,
        filter: payload,
        error: errorPayload(ErrorCode.SUBSCRIPTION_REJECTED, "subscription must include at least one filter criterion")
      });
    }

    this._subscriptions.set(subscriptionId, {
      id: subscriptionId,
      filter: payload,
      created_at: this.now()
    });

    return this._event("subscription.created", event, {
      subscription_id: subscriptionId,
      filter: payload
    });
  }

  _handleSubscriptionCancelled(event) {
    const subId = event.payload?.subscription_id;
    if (subId && this._subscriptions.has(subId)) {
      this._subscriptions.delete(subId);
    }
    return this._event("event.acknowledged", event, {
      acknowledged_event_id: event.id
    });
  }

  _handleTaskSubmitted(event) {
    const taskId = event.task_id ?? event.payload?.task_id ?? `task_${Date.now().toString(36)}`;
    if (this._tasks.has(taskId)) {
      return this._event("event.rejected", event, {
        error: errorPayload(ErrorCode.TASK_ERROR, `duplicate task id: ${taskId}`)
      });
    }

    const tracker = new TaskTracker({
      task_id: taskId,
      description: event.payload?.description,
      source: event.source,
      session_id: event.session_id,
      conversation_id: event.conversation_id,
      created_at: event.created_at
    });

    this._tasks.set(taskId, tracker);
    tracker.accepted();

    return this._event("task.accepted", event, {
      task_id: taskId,
      status: "accepted"
    });
  }

  _handleTaskEvent(event) {
    const taskId = event.task_id ?? event.payload?.task_id;
    if (!taskId) {
      return;
    }
    if (!this._tasks.has(taskId)) {
      return this._event("event.rejected", event, {
        error: errorPayload(ErrorCode.TASK_ERROR, `unknown task: ${taskId}`)
      });
    }

    const tracker = this._tasks.get(taskId);

    try {
      const taskEvent = tracker.transition(event.type, event.payload);
      const responses = [this._event("event.acknowledged", event, {
        acknowledged_event_id: event.id
      })];
      responses.push(taskEvent);

      if (tracker.isTerminal()) {
        this._tasks.delete(taskId);
      }

      return responses;
    } catch (err) {
      return this._event("event.rejected", event, {
        error: errorPayload(ErrorCode.TASK_ERROR, err.message)
      });
    }
  }

  _handleTaskCancelRequested(event) {
    const taskId = event.task_id ?? event.payload?.task_id;
    if (!taskId || !this._tasks.has(taskId)) {
      return this._event("event.rejected", event, {
        error: errorPayload(ErrorCode.TASK_ERROR, `unknown task: ${taskId ?? "missing"}`)
      });
    }
    return this._event("event.acknowledged", event, {
      acknowledged_event_id: event.id
    });
  }

  _handleSessionOpened(event) {
    if (this._session && this._session.isActive()) {
      return this._event("event.rejected", event, {
        error: errorPayload(ErrorCode.SESSION_ERROR, "session already active", { details: { existing_session: this._session.id } })
      });
    }

    this._session = new HarmovelaSession({
      id: event.session_id ?? `sess_${Date.now().toString(36)}`,
      source: this.source,
      version: "0.2"
    });

    this._session.opened();

    return this._session.ready({
      protocol: "harmovela",
      spec_version: "0.2",
      transports: ["stdio"],
      features: ["envelope", "subscription", "task_lifecycle", "error_model"]
    });
  }

  _handleSessionClosed(event) {
    if (!this._session || !this._session.isOpen()) {
      return this._event("event.acknowledged", event, {
        acknowledged_event_id: event.id
      });
    }

    const closedEvent = this._session.close();
    const responses = [this._event("event.acknowledged", event, {
      acknowledged_event_id: event.id
    })];
    if (closedEvent) {
      responses.push(closedEvent);
    }
    return responses;
  }

  startSession(options = {}) {
    this._session = new HarmovelaSession(options);
    return this._session.opened();
  }

  _handleCommandRequested(event) {
    const correlationId = event.correlation_id ?? `cmd_${Date.now().toString(36)}`;
    const target = event.target;
    const source = event.source;
    const negotiationWindowMs = event.payload?.negotiation_window_ms ?? 5000;

    if (!target) {
      return this._event("command.rejected", event, {
        correlation_id: correlationId,
        reason: "missing target agent",
        error: errorPayload(ErrorCode.INVALID_COMMAND, "command.requested must include target agent")
      });
    }

    if (this._commands.has(correlationId)) {
      return this._event("command.rejected", event, {
        correlation_id: correlationId,
        reason: "duplicate correlation_id",
        error: errorPayload(ErrorCode.INVALID_COMMAND, `duplicate command correlation_id: ${correlationId}`)
      });
    }

    this._commands.set(correlationId, {
      id: correlationId,
      source,
      target,
      status: "accepted",
      accepted_at: this.now(),
      negotiation_window_ms: negotiationWindowMs,
      payload: event.payload
    });

    return this._event("command.accepted", event, {
      correlation_id: correlationId,
      target: target,
      negotiation_window_ms: negotiationWindowMs
    });
  }

  _handleCommandLifecycle(event) {
    const correlationId = event.correlation_id;
    if (!this._commands.has(correlationId)) {
      return this._event("event.acknowledged", event, {
        acknowledged_event_id: event.id
      });
    }

    const cmd = this._commands.get(correlationId);

    if (event.type === "command.completed" || event.type === "command.failed") {
      cmd.status = event.type === "command.completed" ? "completed" : "failed";
      cmd.completed_at = this.now();
      this._commands.delete(correlationId);
    } else if (event.type === "command.rejected") {
      cmd.status = "rejected";
      this._commands.delete(correlationId);
    }

    return this._event("event.acknowledged", event, {
      acknowledged_event_id: event.id
    });
  }

  _handleQueryRequested(event) {
    const correlationId = event.correlation_id ?? `qry_${Date.now().toString(36)}`;
    const target = event.target;
    const scope = event.payload?.query_scope;

    if (!target) {
      return this._event("query.rejected", event, {
        correlation_id: correlationId,
        reason: "missing target agent",
        error: errorPayload(ErrorCode.INVALID_QUERY, "query.requested must include target agent")
      });
    }

    if (!scope) {
      return this._event("query.rejected", event, {
        correlation_id: correlationId,
        reason: "missing query scope",
        error: errorPayload(ErrorCode.INVALID_QUERY, "query.requested must include query_scope in payload")
      });
    }

    const snapshotVersion = `snap_${Date.now().toString(36)}_${String(++this._sequence).padStart(4, "0")}`;

    this._queries.set(correlationId, {
      id: correlationId,
      source: event.source,
      target,
      scope,
      snapshot_version: snapshotVersion,
      created_at: this.now(),
      freshness: event.payload?.freshness,
      pagination: event.payload?.pagination
    });

    return this._event("query.response", event, {
      correlation_id: correlationId,
      query_scope: scope,
      snapshot_version: snapshotVersion,
      freshness: event.payload?.freshness ?? null,
      pagination: event.payload?.pagination ? { ...event.payload.pagination, next_cursor: null } : null
    });
  }

  _handleQueryLifecycle(event) {
    const correlationId = event.correlation_id;

    if (event.type === "query.error") {
      if (this._queries.has(correlationId)) {
        this._queries.delete(correlationId);
      }
    }

    return this._event("event.acknowledged", event, {
      acknowledged_event_id: event.id
    });
  }

  _handleAdaptationEvent(event) {
    const payload = event.payload || {};
    const type = event.type;

    if (type === "adaptation.budget.established") {
      const budgetId = payload.budget_id;
      const limit = payload.limit;
      const tenantId = event.tenant_id;
      if (budgetId && typeof limit === "number" && limit > 0) {
        this._budgetLimits[budgetId] = limit;
        if (tenantId) {
          if (!this._budget[tenantId]) this._budget[tenantId] = {};
          this._budget[tenantId][budgetId] = limit;
        }
      }
    } else if (type === "adaptation.budget.adjusted") {
      const budgetId = payload.budget_id;
      const newLimit = payload.new_limit;
      const tenantId = event.tenant_id;
      if (budgetId && typeof newLimit === "number") {
        const oldLimit = this._budgetLimits[budgetId] || 0;
        const delta = newLimit - oldLimit;
        this._budgetLimits[budgetId] = newLimit;
        if (tenantId) {
          if (!this._budget[tenantId]) this._budget[tenantId] = {};
          if (!this._budget[tenantId][budgetId]) this._budget[tenantId][budgetId] = 0;
          this._budget[tenantId][budgetId] += delta;
        }
      }
    }

    return [this._event("event.acknowledged", event, {
      acknowledged_event_id: event.id,
    })];
  }

  _event(type, input, payload) {
    const next = String(++this._sequence).padStart(6, "0");

    return {
      spec_version: input?.spec_version ?? "0.2",
      id: `evt_harness_${next}`,
      type,
      source: this.source,
      target: input?.source,
      topic: input?.topic,
      session_id: input?.session_id,
      conversation_id: input?.conversation_id,
      task_id: input?.task_id,
      correlation_id: input?.correlation_id,
      causation_id: input?.id,
      created_at: this.now(),
      delivery: {
        mode: "best_effort",
        sequence: this._sequence
      },
      payload
    };
  }
}
