import uuid
from datetime import datetime, timezone

from ..router import EventRouter
from ..envelope import validate_envelope
from ..subscription import subscription_matches
from ..transport.websocket import WsServerTransport
from .config import create_delivery_store
from .api_server import start_api_server


class AepRuntimeService:
    def __init__(self, config: dict, router=None, store=None):
        self.config = config
        self.router = router or EventRouter()
        self.store = store or create_delivery_store(config)
        self.transports = {}
        self.subscriptions = {}
        self.max_buffer = 1000
        self.started = False

    def subscribe(self, pattern, handler):
        self.router.on(pattern, handler)
        return self

    def publish(self, event: dict) -> dict:
        errors = validate_envelope(event)
        if errors:
            raise ValueError(f"invalid AEP event: {'; '.join(errors)}")
        if hasattr(self.store, "track"):
            self.store.track(event["id"], event.get("subscription_id", "_runtime"))
        self.router.dispatch(event)
        for transport in list(self.transports.values()):
            send = getattr(transport, "send", None)
            if callable(send):
                send(event)
        for entry in self.subscriptions.values():
            if subscription_matches({"payload": entry["record"]["filter"]}, event):
                entry["buffer"].append(event)
                if len(entry["buffer"]) > self.max_buffer:
                    entry["buffer"].pop(0)
                for sink in list(entry["sinks"]):
                    sink(event)
        return event

    def start(self):
        if self.started:
            return
        ws = self.config.get("transports", {}).get("websocket", {})
        if ws.get("enabled"):
            transport = WsServerTransport(port=ws.get("port", 0), host=ws.get("host", "127.0.0.1"), path=ws.get("path", "/aep"))
            transport.on_event = lambda event: self.publish(event)
            transport.start()
            self.transports["websocket"] = transport
        api = self.config.get("transports", {}).get("api", {})
        if api.get("enabled"):
            self.transports["api"] = start_api_server(self, api)
        lister = getattr(self.store, "list_subscriptions", None)
        if callable(lister):
            for record in lister():
                self.subscriptions[record["id"]] = {"record": record, "buffer": [], "sinks": set()}
        self.started = True

    def stop(self):
        for transport in reversed(list(self.transports.values())):
            stop = getattr(transport, "stop", None)
            if callable(stop):
                stop()
        self.transports = {}
        close = getattr(self.store, "close", None)
        if callable(close):
            close()
        self.started = False

    def get_stats(self) -> dict:
        get = getattr(self.store, "get_stats", None)
        return get() if callable(get) else {}

    def get_pending(self) -> list:
        get = getattr(self.store, "get_pending", None)
        return get() if callable(get) else []

    def get_dead_lettered(self) -> list:
        get = getattr(self.store, "get_dead_lettered", None)
        return get() if callable(get) else []

    def create_subscription(self, filter_: dict) -> dict:
        record = {
            "id": f"sub_{uuid.uuid4().hex}",
            "filter": filter_ or {},
            "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        }
        creator = getattr(self.store, "create_subscription", None)
        if callable(creator):
            creator(record)
        self.subscriptions[record["id"]] = {"record": record, "buffer": [], "sinks": set()}
        return record

    def list_subscriptions(self) -> list:
        return [entry["record"] for entry in self.subscriptions.values()]

    def get_subscription(self, subscription_id: str) -> dict | None:
        entry = self.subscriptions.get(subscription_id)
        return entry["record"] if entry else None

    def delete_subscription(self, subscription_id: str) -> bool:
        existed = self.subscriptions.pop(subscription_id, None) is not None
        deleter = getattr(self.store, "delete_subscription", None)
        if callable(deleter):
            deleter(subscription_id)
        return existed

    def take_events(self, subscription_id: str, max_count: int) -> list:
        entry = self.subscriptions.get(subscription_id)
        if not entry:
            return []
        taken = entry["buffer"][:max_count]
        entry["buffer"] = entry["buffer"][max_count:]
        return taken

    def attach_stream(self, subscription_id: str, sink):
        entry = self.subscriptions.get(subscription_id)
        if not entry:
            return None
        entry["sinks"].add(sink)
        def detach():
            entry["sinks"].discard(sink)
        return detach
