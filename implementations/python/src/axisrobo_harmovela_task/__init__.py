from datetime import datetime, timezone


class TaskState:
    SUBMITTED = "submitted"
    ACCEPTED = "accepted"
    STARTED = "started"
    BLOCKED = "blocked"
    PROGRESS = "progress"
    OUTPUT = "output"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    TIMED_OUT = "timed_out"


TASK_TIMEOUT = "task_timeout"

TERMINAL_STATES = frozenset({
    TaskState.COMPLETED, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT
})

_TRANSITIONS = {
    TaskState.SUBMITTED: {TaskState.ACCEPTED, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT},
    TaskState.ACCEPTED: {TaskState.STARTED, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT},
    TaskState.STARTED: {TaskState.PROGRESS, TaskState.OUTPUT, TaskState.BLOCKED,
                        TaskState.COMPLETED, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT},
    TaskState.BLOCKED: {TaskState.STARTED, TaskState.PROGRESS, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT},
    TaskState.PROGRESS: {TaskState.PROGRESS, TaskState.OUTPUT, TaskState.BLOCKED,
                         TaskState.COMPLETED, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT},
    TaskState.OUTPUT: {TaskState.PROGRESS, TaskState.OUTPUT, TaskState.BLOCKED,
                       TaskState.COMPLETED, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT},
}

_EVENT_TO_STATE = {
    "task.submitted": TaskState.SUBMITTED,
    "task.accepted": TaskState.ACCEPTED,
    "task.started": TaskState.STARTED,
    "task.blocked": TaskState.BLOCKED,
    "task.progress": TaskState.PROGRESS,
    "task.output": TaskState.OUTPUT,
    "task.completed": TaskState.COMPLETED,
    "task.failed": TaskState.FAILED,
    "task.cancelled": TaskState.CANCELLED,
    "task.timed_out": TaskState.TIMED_OUT,
}


def _error_payload(code: str, message: str, *, retryable: bool = False, details: dict | None = None) -> dict:
    payload = {"code": code, "message": message, "retryable": retryable}
    if details:
        payload["details"] = details
    return payload


class TaskTracker:
    def __init__(self, task_id: str | None = None, description: str = "",
                 source: str = "unknown", session_id: str | None = None,
                 conversation_id: str | None = None, created_at: str | None = None):
        self.id = task_id or f"task_{int(datetime.now(timezone.utc).timestamp() * 1000):x}"
        self.description = description
        self.state = TaskState.SUBMITTED
        self.source = source
        self.session_id = session_id
        self.conversation_id = conversation_id
        self.created_at = created_at or self._now()
        self.updated_at = self.created_at
        self._event_id = 0

    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    def _next_id(self) -> str:
        self._event_id += 1
        return f"evt_task_{self._event_id:06d}"

    def transition(self, event_type: str, payload: dict | None = None) -> dict:
        next_state = _EVENT_TO_STATE.get(event_type)
        if next_state is None:
            raise ValueError(f"unknown task event type: {event_type}")

        if next_state != self.state and next_state not in _TRANSITIONS.get(self.state, set()):
            raise RuntimeError(f"illegal task transition: {self.state} -> {next_state} for task {self.id}")

        self.state = next_state
        self.updated_at = self._now()

        event_payload = {"task_id": self.id, "state": self.state}
        if payload:
            event_payload.update(payload)

        event = {
            "spec_version": "0.2",
            "id": self._next_id(),
            "type": event_type,
            "source": self.source,
            "session_id": self.session_id,
            "conversation_id": self.conversation_id,
            "task_id": self.id,
            "created_at": self.updated_at,
            "payload": event_payload,
        }

        if self.state in TERMINAL_STATES and "result" not in event_payload:
            event_payload["result"] = self.state

        return event

    def submitted(self) -> dict: return self.transition("task.submitted")
    def accepted(self) -> dict: return self.transition("task.accepted")
    def started(self) -> dict: return self.transition("task.started")
    def blocked(self, reason: str | None = None) -> dict:
        return self.transition("task.blocked", {"reason": reason} if reason else None)
    def progress(self, data: dict | None = None) -> dict:
        return self.transition("task.progress", data)
    def output(self, data: dict | None = None) -> dict:
        return self.transition("task.output", data)
    def completed(self, result=None) -> dict:
        return self.transition("task.completed", {"result": result} if result is not None else None)
    def failed(self, code: str, message: str, details: dict | None = None) -> dict:
        return self.transition("task.failed", {"error": _error_payload(code, message, details=details or {})})
    def cancelled(self, reason: str | None = None) -> dict:
        return self.transition("task.cancelled", {"reason": reason} if reason else None)
    def timed_out(self) -> dict:
        return self.transition("task.timed_out", {
            "error": _error_payload(TASK_TIMEOUT, f"task {self.id} timed out", retryable=True)
        })

    def is_terminal(self) -> bool:
        return self.state in TERMINAL_STATES

    def is_active(self) -> bool:
        return not self.is_terminal() and self.state != TaskState.SUBMITTED
