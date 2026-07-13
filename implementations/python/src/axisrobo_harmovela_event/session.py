from datetime import datetime, timezone


class HarmovelaSession:
    def __init__(self, id: str | None = None, source: str = "harmovela:session",
                 version: str = "0.2", heartbeat_interval_ms: int = 0):
        self.id = id or f"sess_{int(datetime.now(timezone.utc).timestamp() * 1000):x}"
        self.source = source
        self.version = version
        self.capabilities = None
        self.state = "created"
        self.heartbeat_interval = heartbeat_interval_ms
        self._event_id = 0
        self._opened_at: str | None = None
        self._ready_at: str | None = None

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    def _next_id(self) -> str:
        self._event_id += 1
        return f"evt_sess_{self._event_id:06d}"

    def _event(self, type_: str, created_at: str, payload: dict) -> dict:
        return {
            "spec_version": self.version,
            "id": self._next_id(),
            "type": type_,
            "source": self.source,
            "session_id": self.id,
            "created_at": created_at,
            "payload": payload,
        }

    def opened(self) -> dict:
        if self.state != "created":
            raise RuntimeError(f"cannot open session in state {self.state}")
        self.state = "opened"
        self._opened_at = self._now()
        return self._event("session.opened", self._opened_at, {"session_id": self.id, "version": self.version})

    def ready(self, capabilities: dict | None = None) -> dict:
        if self.state not in ("created", "opened"):
            raise RuntimeError(f"cannot mark session ready in state {self.state}")
        self.state = "ready"
        self._ready_at = self._now()
        self.capabilities = capabilities or self.capabilities
        return self._event("session.ready", self._ready_at, {
            "session_id": self.id,
            "capabilities": self.capabilities,
        })

    def heartbeat(self) -> dict | None:
        if self.state != "ready":
            return None
        return self._event("session.heartbeat", self._now(), {"session_id": self.id})

    def close(self) -> dict | None:
        if self.state == "closed":
            return None
        self.state = "closed"
        return self._event("session.closed", self._now(), {
            "session_id": self.id,
            "reason": "closed_by_peer",
        })

    def error(self, code: str, message: str, details: dict | None = None) -> dict:
        self.state = "error"
        return self._event("session.error", self._now(), {
            "session_id": self.id,
            "error": {"code": code, "message": message, "retryable": False, "details": details or {}},
        })

    def is_active(self) -> bool:
        return self.state == "ready"

    def is_open(self) -> bool:
        return self.state in ("opened", "ready")

    def is_terminal(self) -> bool:
        return self.state in ("closed", "error")
