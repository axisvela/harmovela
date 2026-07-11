from ..router import EventRouter
from ..envelope import validate_envelope
from ..transport.websocket import WsServerTransport
from .config import create_delivery_store
from .api_server import start_api_server


class AepRuntimeService:
    def __init__(self, config: dict, router=None, store=None):
        self.config = config
        self.router = router or EventRouter()
        self.store = store or create_delivery_store(config)
        self.transports = {}
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
