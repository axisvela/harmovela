from datetime import datetime, timezone

from axisrobo_harmovela_adaptation import ADAPTATION_EVENT_TYPES, is_adaptation_event_type
from axisrobo_harmovela_agent import AGENT_EVENT_TYPES
from axisrobo_harmovela_context import CONTEXT_MEMORY_EVENT_TYPES
from axisrobo_harmovela_delegation import DELEGATION_EVENT_TYPES
from axisrobo_harmovela_environment import ENVIRONMENT_EVENT_TYPES
from axisrobo_harmovela_event import EventRouter, HarmovelaSession, is_standard_event_type, validate_envelope
from axisrobo_harmovela_event import ErrorCode, error_payload
from axisrobo_harmovela_governance import authorize
from axisrobo_harmovela_recovery import RECOVERY_EVENT_TYPES, DeliveryTracker
from axisrobo_harmovela_state import STATE_EVENT_TYPES
from axisrobo_harmovela_task import TaskTracker
from axisrobo_harmovela_tool import TOOL_EVENT_TYPES

LEGACY_DIMENSION_EVENT_TYPES = frozenset({
    "event.acknowledged", "event.rejected", "event.redelivered", "event.replayed", "event.dead_lettered",
    "task.submitted", "task.accepted", "task.started", "task.blocked", "task.progress",
    "task.output", "task.completed", "task.failed", "task.cancel.requested", "task.cancelled", "task.timed_out",
}.union(CONTEXT_MEMORY_EVENT_TYPES).union(DELEGATION_EVENT_TYPES).union(RECOVERY_EVENT_TYPES).union(STATE_EVENT_TYPES).union(TOOL_EVENT_TYPES).union(AGENT_EVENT_TYPES).union(ENVIRONMENT_EVENT_TYPES).union(ADAPTATION_EVENT_TYPES))


def is_legacy_dimension_event_type(type_: str) -> bool:
    return type_ in LEGACY_DIMENSION_EVENT_TYPES


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
        self._audit: list[dict] = []
        self._budget: dict[str, dict[str, float]] = {}
        self._budget_limits: dict[str, float] = {}
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

    @property
    def audit(self) -> list[dict]:
        return self._audit

    def _setup_router(self):
        self._router \
            .on("capabilities.requested", self._handle_capabilities) \
            .on("subscription.requested", self._handle_subscription_requested) \
            .on("subscription.cancelled", self._handle_subscription_cancelled) \
            .on("task.submitted", self._handle_task_submitted) \
            .on("task.cancel.requested", self._handle_task_cancel_requested) \
            .on(lambda e: e.get("type", "").startswith("task.") and e.get("type") not in ("task.submitted", "task.cancel.requested"),
                self._handle_task_event) \
            .on("session.opened", self._handle_session_opened) \
            .on("session.closed", self._handle_session_closed) \
            .on(lambda e: e.get("type", "").startswith("adaptation."), self._handle_adaptation_event)

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

        if not is_standard_event_type(value.get("type", "")) and not is_legacy_dimension_event_type(value.get("type", "")):
            return [self._event("event.rejected", value, {
                "errors": [f"type not in standard draft registry: {value.get('type')}"],
                "error": error_payload(ErrorCode.INVALID_EVENT_TYPE, f"unknown event type: {value.get('type')}", retryable=False),
            })]

        if value.get("spec_version") != "0.2":
            return [self._event("event.rejected", value, {
                "errors": [f"unsupported protocol version: {value.get('spec_version')}"],
                "error": error_payload(ErrorCode.UNSUPPORTED_VERSION, f"unsupported version {value.get('spec_version')}",
                                        details={"supported": ["0.2"]}),
            })]

        if value.get("actor_id") and value.get("requested_action"):
            decision = authorize(
                {
                    "actor_id": value["actor_id"],
                    "tenant_id": value.get("tenant_id"),
                    "roles": value.get("roles", []),
                },
                value["requested_action"],
                value.get("target_tenant_id"),
            )
            self._audit.append({
                "actor_id": value["actor_id"],
                "tenant_id": value.get("tenant_id"),
                "action": value["requested_action"],
                "target_tenant_id": value.get("target_tenant_id"),
                "allowed": decision["allowed"],
                "correlation_id": value.get("correlation_id"),
                "causation_id": value.get("causation_id"),
            })
            if not decision["allowed"]:
                return [self._event("event.rejected", value, {
                    "error": error_payload(ErrorCode.UNAUTHORIZED, f"governance denied: {decision['reason']}"),
                })]

        if isinstance(value.get("budget_cost"), (int, float)) and value["budget_cost"] > 0:
            budget_id = value.get("budget_id")
            tenant_id = value.get("tenant_id")
            if budget_id and tenant_id:
                remaining = self._budget.get(tenant_id, {}).get(budget_id, 0.0)
                cost = float(value["budget_cost"])
                if remaining < cost:
                    self._audit.append({
                        "actor_id": value.get("actor_id"),
                        "tenant_id": tenant_id,
                        "action": "adaptation.budget.limit_exceeded",
                        "correlation_id": value.get("correlation_id"),
                        "causation_id": value.get("causation_id"),
                        "allowed": False,
                    })
                    return [
                        self._event("event.rejected", value, {
                            "error": error_payload(ErrorCode.BUDGET_EXCEEDED, f"budget limit exceeded for {budget_id}"),
                        }),
                        self._event("adaptation.budget.limit_exceeded", value, {
                            "budget_id": budget_id,
                            "tenant_id": tenant_id,
                            "cost": cost,
                            "remaining": remaining,
                            "limit": self._budget_limits.get(budget_id),
                        }),
                    ]

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

    def _handle_task_cancel_requested(self, event: dict) -> list:
        task_id = event.get("task_id") or event.get("payload", {}).get("task_id")
        if not task_id or task_id not in self._tasks:
            return [self._event("event.rejected", event, {
                "error": error_payload(ErrorCode.TASK_ERROR, f"unknown task: {task_id or 'missing'}"),
            })]
        return [self._event("event.acknowledged", event, {
            "acknowledged_event_id": event.get("id"),
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

    def _handle_adaptation_event(self, event: dict) -> list:
        payload = event.get("payload", {})
        typ = event.get("type", "")

        if typ == "adaptation.budget.established":
            budget_id = payload.get("budget_id")
            limit = payload.get("limit")
            tenant_id = event.get("tenant_id")
            if budget_id and isinstance(limit, (int, float)) and limit > 0:
                self._budget_limits[budget_id] = float(limit)
                if tenant_id:
                    self._budget.setdefault(tenant_id, {})[budget_id] = float(limit)
            return [self._event("event.acknowledged", event, {
                "acknowledged_event_id": event.get("id"),
            })]

        if typ == "adaptation.budget.adjusted":
            budget_id = payload.get("budget_id")
            new_limit = payload.get("new_limit")
            tenant_id = event.get("tenant_id")
            if budget_id and isinstance(new_limit, (int, float)):
                old_limit = self._budget_limits.get(budget_id, 0.0)
                delta = new_limit - old_limit
                self._budget_limits[budget_id] = float(new_limit)
                if tenant_id:
                    self._budget.setdefault(tenant_id, {}).setdefault(budget_id, 0.0)
                    self._budget[tenant_id][budget_id] += delta
            return [self._event("event.acknowledged", event, {
                "acknowledged_event_id": event.get("id"),
            })]

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
