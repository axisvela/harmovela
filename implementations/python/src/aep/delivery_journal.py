from datetime import datetime, timezone


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class DeliveryJournal:
    def __init__(self, stream_id: str = "stream_01"):
        self._stream_id = stream_id
        self._events: list[dict] = []
        self._sequence = 0

    def next_sequence(self) -> int:
        self._sequence += 1
        return self._sequence

    def append(self, event: dict) -> int:
        seq = self.next_sequence()
        record = {
            **event,
            "_journal_sequence": seq,
            "_journal_cursor": f"{self._stream_id}:{seq}",
            "_journal_appendedAt": _now(),
        }
        self._events.append(record)
        return seq

    def replay(self, cursor: str | None = None) -> list[dict]:
        if cursor is None:
            return list(self._events)
        parts = cursor.split(":")
        since_seq = int(parts[1]) if len(parts) > 1 else 0
        return [e for e in self._events if e["_journal_sequence"] > since_seq]

    def replay_since_sequence(self, seq: int) -> list[dict]:
        return [e for e in self._events if e["_journal_sequence"] > seq]

    def purge(self, cursor: str) -> int:
        parts = cursor.split(":")
        before_seq = int(parts[1]) if len(parts) > 1 else 0
        removed = 0
        while self._events and self._events[0]["_journal_sequence"] <= before_seq:
            self._events.pop(0)
            removed += 1
        return removed

    def get_stats(self) -> dict:
        return {
            "totalEvents": len(self._events),
            "oldestSequence": self._events[0]["_journal_sequence"] if self._events else None,
            "newestSequence": self._events[-1]["_journal_sequence"] if self._events else None,
        }
