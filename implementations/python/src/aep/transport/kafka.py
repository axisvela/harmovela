import json
from typing import Callable, Optional

class KafkaTransport:
    def __init__(self, brokers: list[str] | None = None, topic: str = "aep.events", prefix: str = "aep"):
        self._brokers = brokers or ["localhost:9092"]
        self._topic = topic
        self._prefix = prefix
        self._started = False

    @property
    def brokers(self) -> list[str]:
        return self._brokers

    @property
    def topic(self) -> str:
        return self._topic

    @property
    def prefix(self) -> str:
        return self._prefix

    @property
    def is_running(self) -> bool:
        return self._started

    def on_message(self, handler: Callable):
        self._on_message = handler

    def on_error(self, handler: Callable):
        self._on_error = handler

    def start(self):
        self._started = True
        # Production: create Kafka consumer and producer
        # from confluent_kafka import Consumer, Producer

    def stop(self):
        self._started = False

    def send(self, event: dict):
        if not self._started:
            raise RuntimeError("not started")
        # Validate JSON serialization
        json.dumps(event)

    def message_key(self, event: dict) -> str:
        if event.get("task_id"):
            return event["task_id"]
        if event.get("conversation_id"):
            return event["conversation_id"]
        if event.get("session_id"):
            return event["session_id"]
        if event.get("source"):
            return event["source"]
        return ""

    def target_topic(self, event: dict) -> str:
        if event.get("type"):
            return f"{self._prefix}.type.{event['type']}"
        if event.get("source"):
            return f"{self._prefix}.source.{event['source']}"
        return self._topic

    def message_headers(self, event: dict) -> dict[str, str]:
        headers = {}
        for field, header in [
            ("type", "aep-type"), ("source", "aep-source"),
            ("session_id", "aep-session"), ("conversation_id", "aep-conversation"),
            ("task_id", "aep-task"), ("correlation_id", "aep-correlation"),
            ("causation_id", "aep-causation"),
        ]:
            if event.get(field):
                headers[header] = str(event[field])
        delivery = event.get("delivery", {})
        if isinstance(delivery, dict) and delivery.get("mode"):
            headers["aep-delivery-mode"] = delivery["mode"]
        return headers
