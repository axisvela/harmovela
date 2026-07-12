from datetime import datetime, timezone

from .envelope import validate_envelope
from .event_types import is_standard_event_type
from .session import HarmovelaSession
from .task import TaskTracker
from .router import EventRouter
from .errors import ErrorCode, error_payload
from .delivery import DeliveryTracker


class HarmovelaHarness:
    def __init__(self, source: str = "harness:harmovela", now_fn=None):
        self.source = source
        self._now = now_fn or (lambda: datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"))
        self._sequence = 0
        self._subscriptions: dict[str, dict] = {}
        self._tasks: dict[str, TaskTracker] = {}
        self._router = EventRouter()
        self._session: HarmovelaSession | None = None
        self._delivery = DeliveryTracker()
        self._setup_router()
        self._setup_delivery_router()

    @property
    def session(self) -> HarmovelaSession | None:
        return self._session

    @property
    def subscriptions(self) -> dict:
        return dict(self._subscriptions)

    @property
    def tasks(self) -> dict:
        return dict(self._tasks)

    def _setup_router(self):
        self._router \
            .on("capabilities.requested", self._handle_capabilities) \
            .on("subscription.requested", self._handle_subscription_requested) \
            .on("subscription.cancelled", self._handle_subscription_cancelled) \
            .on("task.submitted", self._handle_task_submitted) \
            .on(lambda e: e.get("type", "").startswith("task.") and e.get("type") != "task.submitted",
                self._handle_task_event) \
            .on("session.opened", self._handle_session_opened) \
            .on("session.closed", self._handle_session_closed)

    def _setup_delivery_router(self):
        self._router \
            .on("event.acknowledged", self._handle_inbound_ack) \
            .on("event.redelivered", self._handle_inbound_redeliver) \
            .on("event.dead_lettered", self._handle_inbound_dead_letter)

    def handle(self, value: dict) -> list[dict]:
        errors = validate_envelope(value)
        if errors:
            return [self._event("event.rejected", value, {
                "errors": errors,
                "error": error_payload(ErrorCode.INVALID_ENVELOPE, errors[0]),
            })]

        if not is_standard_event_type(value.get("type", "")) and not value.get("type", "").startswith("session."):
            return [self._event("event.rejected", value, {
                "errors": [f"type not in standard draft registry: {value.get('type')}"],
                "error": error_payload(ErrorCode.INVALID_EVENT_TYPE, f"unknown event type: {value.get('type')}", retryable=False),
            })]

        if value.get("aep_version"):
            return [self._event("event.rejected", value, {
                "errors": ["aep_version is not supported; use spec_version instead"],
                "error": error_payload(ErrorCode.UNSUPPORTED_VERSION, "use spec_version instead of aep_version",
                                       details={"supported": ["0.2"]}),
            })]

        if value.get("spec_version") != "0.2":
            return [self._event("event.rejected", value, {
                "errors": [f"unsupported protocol version: {value.get('spec_version')}"],
                "error": error_payload(ErrorCode.UNSUPPORTED_VERSION, f"unsupported version {value.get('spec_version')}",
                                       details={"supported": ["0.2"]}),
            })]

        delivery = value.get("delivery", {})
        if isinstance(delivery, dict) and delivery.get("mode"):
            self._delivery.track(value.get("id"), value.get("session_id", "_default"))

        routed = self._router.dispatch(value)
        if routed:
            return routed

        return [self._event("event.acknowledged", value, {
            "acknowledged_event_id": value.get("id"),
        })]

    def start_session(self, **kwargs) -> dict:
        self._session = HarmovelaSession(**kwargs)
        return self._session.opened()

    def _handle_capabilities(self, event: dict) -> dict:
        return self._event("capabilities.declared", event, {
            "protocol": "aep",
            "spec_version": "0.2",
            "transports": ["stdio"],
            "delivery_modes": ["best_effort", "at_least_once", "replayable"],
            "features": [
                "envelope_validation", "event_type_registry", "subscription_matching",
                "session_lifecycle", "task_lifecycle", "error_model", "event_routing",
            ],
        })

    def _handle_subscription_requested(self, event: dict) -> dict:
        payload = event.get("payload", {})
        sub_id = f"sub_{self._sequence + 1:04d}"
        self._sequence += 1

        if not any(payload.get(k) for k in ("types", "source", "target", "topic")):
            return self._event("subscription.rejected", event, {
                "subscription_id": sub_id,
                "filter": payload,
                "error": error_payload(ErrorCode.SUBSCRIPTION_REJECTED,
                                       "subscription must include at least one filter criterion"),
            })

        self._subscriptions[sub_id] = {"id": sub_id, "filter": payload, "created_at": self._now()}
        return self._event("subscription.created", event, {
            "subscription_id": sub_id,
            "filter": payload,
        })

    def _handle_subscription_cancelled(self, event: dict) -> dict:
        sub_id = event.get("payload", {}).get("subscription_id")
        if sub_id and sub_id in self._subscriptions:
            del self._subscriptions[sub_id]
        return self._event("event.acknowledged", event, {
            "acknowledged_event_id": event.get("id"),
        })

    def _handle_task_submitted(self, event: dict) -> dict:
        task_id = event.get("task_id") or event.get("payload", {}).get("task_id") or f"task_{self._now()}"
        if task_id in self._tasks:
            return self._event("event.rejected", event, {
                "error": error_payload(ErrorCode.TASK_ERROR, f"duplicate task id: {task_id}"),
            })

        tracker = TaskTracker(
            task_id=task_id,
            description=event.get("payload", {}).get("description", ""),
            source=event.get("source", ""),
            session_id=event.get("session_id"),
            conversation_id=event.get("conversation_id"),
            created_at=event.get("created_at"),
        )
        self._tasks[task_id] = tracker
        tracker.accepted()

        return self._event("task.accepted", event, {"task_id": task_id, "status": "accepted"})

    def _handle_task_event(self, event: dict) -> list | None:
        task_id = event.get("task_id") or event.get("payload", {}).get("task_id")
        if not task_id:
            return None
        if task_id not in self._tasks:
            return [self._event("event.rejected", event, {
                "error": error_payload(ErrorCode.TASK_ERROR, f"unknown task: {task_id}"),
            })]

        tracker = self._tasks[task_id]
        try:
            task_event = tracker.transition(event.get("type"), event.get("payload"))
            responses = [self._event("event.acknowledged", event, {
                "acknowledged_event_id": event.get("id"),
            })]
            responses.append(task_event)

            if tracker.is_terminal():
                del self._tasks[task_id]

            return responses
        except (RuntimeError, ValueError) as err:
            return [self._event("event.rejected", event, {
                "error": error_payload(ErrorCode.TASK_ERROR, str(err)),
            })]

    def _handle_session_opened(self, event: dict) -> dict:
        if self._session and self._session.is_active():
            return self._event("event.rejected", event, {
                "error": error_payload(ErrorCode.SESSION_ERROR,
                                       f"session already active", details={"existing_session": self._session.id}),
            })

        self._session = HarmovelaSession(
            id=event.get("session_id") or f"sess_{self._now()}",
            source=self.source,
            version="0.1",
        )
        self._session.opened()
        return self._session.ready({
            "protocol": "aep", "spec_version": "0.2", "transports": ["stdio"],
            "features": ["envelope", "subscription", "task_lifecycle", "error_model"],
        })

    def _handle_session_closed(self, event: dict) -> list:
        if not self._session or not self._session.is_open():
            return [self._event("event.acknowledged", event, {
                "acknowledged_event_id": event.get("id"),
            })]
        closed_event = self._session.close()
        responses = [self._event("event.acknowledged", event, {
            "acknowledged_event_id": event.get("id"),
        })]
        if closed_event:
            responses.append(closed_event)
        return responses

    def _handle_inbound_ack(self, event: dict) -> list:
        event_id = event.get("payload", {}).get("acknowledged_event_id")
        if event_id:
            self._delivery.ack(event_id)
        return [self._event("event.acknowledged", event, {
            "acknowledged_event_id": event.get("id"),
        })]

    def _handle_inbound_redeliver(self, event: dict) -> list:
        event_id = event.get("payload", {}).get("original_event_id")
        if event_id:
            self._delivery.nack(event_id)
        return [self._event("event.acknowledged", event, {
            "acknowledged_event_id": event.get("id"),
        })]

    def _handle_inbound_dead_letter(self, event: dict) -> list:
        event_id = event.get("payload", {}).get("original_event_id")
        if event_id:
            self._delivery.dead_letter(event_id, event.get("payload", {}).get("error", {"code": "unknown"}))
        return [self._event("event.acknowledged", event, {
            "acknowledged_event_id": event.get("id"),
        })]

    def _event(self, type_: str, input_: dict, payload: dict | None = None) -> dict:
        self._sequence += 1
        seq = f"{self._sequence:06d}"
        return {
            "spec_version": input_.get("spec_version", "0.2"),
            "id": f"evt_harness_{seq}",
            "type": type_,
            "source": self.source,
            "target": input_.get("source"),
            "topic": input_.get("topic"),
            "session_id": input_.get("session_id"),
            "conversation_id": input_.get("conversation_id"),
            "task_id": input_.get("task_id"),
            "correlation_id": input_.get("correlation_id"),
            "causation_id": input_.get("id"),
            "created_at": self._now(),
            "delivery": {"mode": "best_effort", "sequence": self._sequence},
            "payload": payload or {},
        }
