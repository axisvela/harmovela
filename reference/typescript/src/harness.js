import { validateEnvelope } from "./validate.js";
import { AepSession } from "./session.js";
import { TaskTracker } from "./task.js";
import { EventRouter } from "./router.js";
import { ErrorCode, errorPayload } from "./errors.js";
import { isStandardEventType } from "./event-types.js";

export class AepHarness {
  constructor(options = {}) {
    this.source = options.source ?? "harness:aep";
    this.now = options.now ?? (() => new Date().toISOString());
    this._sequence = 0;
    this._subscriptions = new Map();
    this._tasks = new Map();
    this._router = new EventRouter();
    this._session = null;

    this._setupRouter();
  }

  get session() { return this._session; }
  get subscriptions() { return new Map(this._subscriptions); }
  get tasks() { return new Map(this._tasks); }

  _setupRouter() {
    this._router
      .on("capabilities.requested", (event) => this._handleCapabilitiesRequested(event))
      .on("subscription.requested", (event) => this._handleSubscriptionRequested(event))
      .on("subscription.cancelled", (event) => this._handleSubscriptionCancelled(event))
      .on("task.submitted", (event) => this._handleTaskSubmitted(event))
      .on((event) => event.type.startsWith("task.") && event.type !== "task.submitted", (event) => this._handleTaskEvent(event))
      .on("session.opened", (event) => this._handleSessionOpened(event))
      .on("session.closed", (event) => this._handleSessionClosed(event));
  }

  handle(value) {
    const errors = validateEnvelope(value);
    if (errors.length > 0) {
      return [this._event("event.rejected", value, {
        errors,
        error: errorPayload(ErrorCode.INVALID_ENVELOPE, errors[0])
      })];
    }

    if (!isStandardEventType(value.type) && !value.type.startsWith("session.")) {
      return [this._event("event.rejected", value, {
        errors: [`type not in standard draft registry: ${value.type}`],
        error: errorPayload(ErrorCode.INVALID_EVENT_TYPE, `unknown event type: ${value.type}`, { retryable: false })
      })];
    }

    if (value.aep_version !== "0.1") {
      return [this._event("event.rejected", value, {
        errors: [`unsupported protocol version: ${value.aep_version}`],
        error: errorPayload(ErrorCode.UNSUPPORTED_VERSION, `unsupported version ${value.aep_version}`, { details: { supported: ["0.1"] } })
      })];
    }

    const routed = this._router.dispatch(value);
    if (routed.length > 0) return routed;

    return [this._event("event.acknowledged", value, {
      acknowledged_event_id: value.id
    })];
  }

  _handleCapabilitiesRequested(event) {
    return this._event("capabilities.declared", event, {
      protocol: "aep",
      aep_version: "0.1",
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

  _handleSessionOpened(event) {
    if (this._session && this._session.isActive()) {
      return this._event("event.rejected", event, {
        error: errorPayload(ErrorCode.SESSION_ERROR, "session already active", { details: { existing_session: this._session.id } })
      });
    }

    this._session = new AepSession({
      id: event.session_id ?? `sess_${Date.now().toString(36)}`,
      source: this.source,
      version: "0.1"
    });

    this._session.opened();

    return this._session.ready({
      protocol: "aep",
      aep_version: "0.1",
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
    this._session = new AepSession(options);
    return this._session.opened();
  }

  _event(type, input, payload) {
    const next = String(++this._sequence).padStart(6, "0");

    return {
      aep_version: input?.aep_version ?? "0.1",
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
