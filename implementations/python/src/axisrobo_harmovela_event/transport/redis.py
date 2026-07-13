import json
from typing import Callable

class RedisTransport:
    def __init__(self, addr: str = "localhost:6379", stream: str = "aep.events", prefix: str = "aep"):
        self._addr = addr
        self._stream = stream
        self._prefix = prefix
        self._started = False

    @property
    def addr(self) -> str:
        return self._addr

    @property
    def stream(self) -> str:
        return self._stream

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
        # Production: create Redis client and consumer group
        # import redis; self._client = redis.Redis.from_url(...)

    def stop(self):
        self._started = False

    def send(self, event: dict):
        if not self._started:
            raise RuntimeError("not started")
        # Validate JSON serialization
        json.dumps(event)

    def stream_key(self, event: dict) -> str:
        if event.get("type"):
            return f"{self._prefix}.type.{event['type']}"
        if event.get("source"):
            return f"{self._prefix}.source.{event['source']}"
        return self._stream

    def consumer_group(self, event: dict) -> str:
        if event.get("session_id"):
            return f"{self._prefix}-{event['session_id']}"
        return f"{self._prefix}-default"

    def entry_fields(self, event: dict) -> dict[str, str]:
        fields = {"body": json.dumps(event)}
        for field, name in [
            ("type", "aep-type"), ("source", "aep-source"),
            ("session_id", "aep-session"), ("conversation_id", "aep-conversation"),
            ("task_id", "aep-task"), ("correlation_id", "aep-correlation"),
            ("causation_id", "aep-causation"),
        ]:
            if event.get(field):
                fields[name] = str(event[field])
        delivery = event.get("delivery", {})
        if isinstance(delivery, dict) and delivery.get("mode"):
            fields["aep-delivery-mode"] = delivery["mode"]
        return fields
