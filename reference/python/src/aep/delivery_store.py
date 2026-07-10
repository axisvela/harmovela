from datetime import datetime, timezone


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class InMemoryDeliveryStore:
    def __init__(self, start_sequence: int = 0, stream_id: str = "stream_01"):
        self._sequence = start_sequence
        self._stream_id = stream_id
        self._pending: dict[str, dict] = {}
        self._acked: set[str] = set()
        self._dead_lettered: dict[str, dict] = {}
        self._last_ack_cursor: str | None = None

    def next_sequence(self) -> int:
        self._sequence += 1
        return self._sequence

    def track(self, event_id: str, subscription_id: str = "_default") -> int:
        seq = self.next_sequence()
        self._pending[event_id] = {
            "eventId": event_id,
            "subscriptionId": subscription_id,
            "sequence": seq,
            "cursor": f"{self._stream_id}:{seq}",
            "attempts": 1,
            "firstAttemptAt": _now(),
            "lastAttemptAt": _now(),
            "nextRetryAt": None,
        }
        return seq

    def ack(self, event_id: str) -> bool:
        entry = self._pending.pop(event_id, None)
        if entry is None:
            return False
        self._acked.add(event_id)
        self._last_ack_cursor = entry["cursor"]
        return True

    def nack(self, event_id: str) -> int | bool:
        entry = self._pending.get(event_id)
        if entry is None:
            return False
        entry["attempts"] += 1
        entry["lastAttemptAt"] = _now()
        return entry["attempts"]

    def dead_letter(self, event_id: str, reason: dict | None = None) -> dict | None:
        entry = self._pending.pop(event_id, None)
        if entry is None:
            return None
        if reason is None:
            reason = {}
        record = {**entry, "deadLetteredAt": _now(), "reason": reason}
        self._dead_lettered[event_id] = record
        return {
            "type": "event.dead_lettered",
            "payload": {
                "original_event_id": event_id,
                "subscription_id": entry["subscriptionId"],
                "cursor": entry["cursor"],
                "attempts": entry["attempts"],
                "last_attempt_at": entry["lastAttemptAt"],
                "error": reason.get("error"),
            },
        }

    def get_pending(self) -> list[dict]:
        return list(self._pending.values())

    def get_pending_for_subscription(self, subscription_id: str) -> list[dict]:
        return [e for e in self._pending.values() if e["subscriptionId"] == subscription_id]

    def is_acknowledged(self, event_id: str) -> bool:
        return event_id in self._acked

    def is_pending(self, event_id: str) -> bool:
        return event_id in self._pending

    def has_attempts_remaining(self, event_id: str, max_attempts: int) -> bool:
        entry = self._pending.get(event_id)
        if entry is None:
            return False
        return entry["attempts"] < max_attempts

    def get_stats(self) -> dict:
        return {
            "totalSequences": self._sequence,
            "pending": len(self._pending),
            "acknowledged": len(self._acked),
            "deadLettered": len(self._dead_lettered),
            "lastAckCursor": self._last_ack_cursor,
        }
