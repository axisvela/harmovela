import { ErrorCode, errorPayload } from "./errors.js";

const TaskState = Object.freeze({
  SUBMITTED: "submitted",
  ACCEPTED: "accepted",
  STARTED: "started",
  BLOCKED: "blocked",
  PROGRESS: "progress",
  OUTPUT: "output",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
  TIMED_OUT: "timed_out"
});

const terminalStates = new Set([
  TaskState.COMPLETED,
  TaskState.FAILED,
  TaskState.CANCELLED,
  TaskState.TIMED_OUT
]);

const allowedTransitions = {
  [TaskState.SUBMITTED]: new Set([TaskState.ACCEPTED, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT]),
  [TaskState.ACCEPTED]: new Set([TaskState.STARTED, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT]),
  [TaskState.STARTED]: new Set([TaskState.PROGRESS, TaskState.OUTPUT, TaskState.BLOCKED, TaskState.COMPLETED, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT]),
  [TaskState.BLOCKED]: new Set([TaskState.STARTED, TaskState.PROGRESS, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT]),
  [TaskState.PROGRESS]: new Set([TaskState.PROGRESS, TaskState.OUTPUT, TaskState.BLOCKED, TaskState.COMPLETED, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT]),
  [TaskState.OUTPUT]: new Set([TaskState.PROGRESS, TaskState.OUTPUT, TaskState.BLOCKED, TaskState.COMPLETED, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT])
};

function nowISO() {
  return new Date().toISOString();
}

export class TaskTracker {
  constructor(data = {}) {
    this.id = data.id ?? data.task_id ?? `task_${Date.now().toString(36)}`;
    this.description = data.description ?? data.payload?.description ?? "";
    this.state = TaskState.SUBMITTED;
    this.source = data.source ?? "unknown";
    this.sessionId = data.session_id ?? null;
    this.conversationId = data.conversation_id ?? null;
    this.createdAt = data.created_at ?? nowISO();
    this.updatedAt = this.createdAt;
    this._eventId = 0;
  }

  nextEventId() {
    return `evt_task_${String(++this._eventId).padStart(6, "0")}`;
  }

  transition(eventType, payload = {}) {
    const nextState = eventTypeToState(eventType);
    if (!nextState) {
      throw new Error(`unknown task event type: ${eventType}`);
    }

    if (nextState !== this.state && !allowedTransitions[this.state]?.has(nextState)) {
      throw new Error(
        `illegal task transition: ${this.state} -> ${nextState} for task ${this.id}`
      );
    }

    this.state = nextState;
    this.updatedAt = nowISO();

    const event = {
      aep_version: "0.1",
      id: this.nextEventId(),
      type: eventType,
      source: this.source,
      session_id: this.sessionId,
      conversation_id: this.conversationId,
      task_id: this.id,
      created_at: this.updatedAt,
      payload: {
        task_id: this.id,
        state: this.state,
        ...payload
      }
    };

    if (terminalStates.has(this.state) && !("result" in event.payload)) {
      event.payload.result = this.state;
    }

    return event;
  }

  submitted() { return this.transition("task.submitted"); }
  accepted() { return this.transition("task.accepted"); }
  started() { return this.transition("task.started"); }
  blocked(reason) { return this.transition("task.blocked", reason ? { reason } : {}); }
  progress(data) { return this.transition("task.progress", data); }
  output(data) { return this.transition("task.output", data); }
  completed(result) { return this.transition("task.completed", result ? { result } : {}); }
  failed(code, message, details) {
    return this.transition("task.failed", {
      error: errorPayload(code, message, { details })
    });
  }
  cancelled(reason) {
    return this.transition("task.cancelled", reason ? { reason } : {});
  }
  timedOut() {
    return this.transition("task.timed_out", {
      error: errorPayload(ErrorCode.TASK_TIMEOUT, `task ${this.id} timed out`, { retryable: true })
    });
  }

  isTerminal() {
    return terminalStates.has(this.state);
  }

  isActive() {
    return !this.isTerminal() && this.state !== TaskState.SUBMITTED;
  }
}

function eventTypeToState(type) {
  const map = {
    "task.submitted": TaskState.SUBMITTED,
    "task.accepted": TaskState.ACCEPTED,
    "task.started": TaskState.STARTED,
    "task.blocked": TaskState.BLOCKED,
    "task.progress": TaskState.PROGRESS,
    "task.output": TaskState.OUTPUT,
    "task.completed": TaskState.COMPLETED,
    "task.failed": TaskState.FAILED,
    "task.cancelled": TaskState.CANCELLED,
    "task.timed_out": TaskState.TIMED_OUT
  };
  return map[type] ?? null;
}
