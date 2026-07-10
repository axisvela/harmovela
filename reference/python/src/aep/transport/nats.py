import json
import asyncio
from typing import Callable


class NatsTransport:
    def __init__(self, url: str = "nats://localhost:4222", prefix: str = "aep"):
        self._url = url
        self._prefix = prefix
        self._nc = None
        self._sub = None
        self._on_message: Callable | None = None
        self._on_error: Callable | None = None
        self._started = False

    @property
    def connected(self) -> bool:
        return self._nc is not None

    def on_message(self, handler: Callable):
        self._on_message = handler

    def on_error(self, handler: Callable):
        self._on_error = handler

    async def start(self):
        if self._started:
            return
        self._started = True
        try:
            import nats
            self._nc = await nats.connect(self._url)
            self._sub = await self._nc.subscribe(f"{self._prefix}.>", cb=self._handle_message)
        except ImportError:
            raise ImportError("nats-py is required for NATS transport. Install with: pip install nats-py")

    async def stop(self):
        if self._sub:
            await self._sub.unsubscribe()
            self._sub = None
        if self._nc:
            await self._nc.drain()
            await self._nc.close()
            self._nc = None
        self._started = False

    async def send(self, event: dict):
        if not self._nc:
            raise RuntimeError("not connected")
        subject = self._event_subject(event)
        data = json.dumps(event).encode()
        await self._nc.publish(subject, data)

    async def _handle_message(self, msg):
        try:
            event = json.loads(msg.data.decode())
            if self._on_message:
                await self._on_message(event) if asyncio.iscoroutinefunction(self._on_message) else self._on_message(event)
        except Exception as e:
            if self._on_error:
                self._on_error(e)

    def _event_subject(self, event: dict) -> str:
        if event.get("topic"):
            return f"{self._prefix}.topic.{event['topic']}"
        if event.get("type"):
            return f"{self._prefix}.type.{event['type']}"
        if event.get("source"):
            return f"{self._prefix}.source.{event['source']}"
        return f"{self._prefix}.event"

    def subscription_subjects(self, patterns: list[str], session_id: str = "") -> list[str]:
        subjects = []
        for p in patterns:
            if p == "*":
                subjects.append(f"{self._prefix}.>")
            else:
                subjects.append(f"{self._prefix}.type.{p.replace('*', '>')}")
        if session_id:
            subjects.append(f"{self._prefix}.sess.{session_id}")
        return subjects
