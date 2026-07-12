from datetime import datetime, timezone

from .errors import error_payload


class AepSession:
    def __init__(self, id: str | None = None, source: str = "aep:session",
                 version: str = "0.1", heartbeat_interval_ms: int = 0):
        self.id = id or f"sess_{int(datetime.now(timezone.utc).timestamp() * 1000):x}"
        self.source = source
        self.version = "0.2"
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

    def opened(self) -> dict:
        if self.state != "created":
            raise RuntimeError(f"cannot open session in state {self.state}")
        self.state = "opened"
        self._opened_at = self._now()
        return {
            "spec_version": self.version,
            "id": self._next_id(),
            "type": "session.opened",
            "source": self.source,
            "session_id": self.id,
            "created_at": self._opened_at,
            "payload": {"session_id": self.id, "version": self.version},
        }

    def ready(self, capabilities: dict | None = None) -> dict:
        if self.state not in ("created", "opened"):
            raise RuntimeError(f"cannot mark session ready in state {self.state}")
        self.state = "ready"
        self._ready_at = self._now()
        self.capabilities = capabilities or self.capabilities
        return {
            "spec_version": self.version,
            "id": self._next_id(),
            "type": "session.ready",
            "source": self.source,
            "session_id": self.id,
            "created_at": self._ready_at,
            "payload": {"session_id": self.id, "capabilities": self.capabilities},
        }

    def heartbeat(self) -> dict | None:
        if self.state != "ready":
            return None
        return {
            "spec_version": self.version,
            "id": self._next_id(),
            "type": "session.heartbeat",
            "source": self.source,
            "session_id": self.id,
            "created_at": self._now(),
            "payload": {"session_id": self.id},
        }

    def close(self) -> dict | None:
        if self.state == "closed":
            return None
        self.state = "closed"
        return {
            "spec_version": self.version,
            "id": self._next_id(),
            "type": "session.closed",
            "source": self.source,
            "session_id": self.id,
            "created_at": self._now(),
            "payload": {"session_id": self.id, "reason": "closed_by_peer"},
        }

    def error(self, code: str, message: str, details: dict | None = None) -> dict:
        if self.state != "error":
            self.state = "error"
        return {
            "spec_version": self.version,
            "id": self._next_id(),
            "type": "session.error",
            "source": self.source,
            "session_id": self.id,
            "created_at": self._now(),
            "payload": {
                "session_id": self.id,
                "error": error_payload(code, message, details=details or {}),
            },
        }

    def is_active(self) -> bool:
        return self.state == "ready"

    def is_open(self) -> bool:
        return self.state in ("opened", "ready")

    def is_terminal(self) -> bool:
        return self.state in ("closed", "error")
