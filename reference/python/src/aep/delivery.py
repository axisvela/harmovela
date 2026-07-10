from .delivery_store import InMemoryDeliveryStore
from .delivery_journal import DeliveryJournal

DEFAULT_RETRY = {
    "max_attempts": 3,
    "backoff_ms": 1000,
    "backoff_multiplier": 2,
    "max_backoff_ms": 30000,
    "ack_timeout_ms": 30000,
}


def retry_delay(attempt: int, policy: dict | None = None) -> int:
    if policy is None:
        policy = DEFAULT_RETRY
    return min(
        policy["backoff_ms"] * (policy["backoff_multiplier"] ** (attempt - 1)),
        policy["max_backoff_ms"],
    )


class DeliveryTracker:
    def __init__(self, store: InMemoryDeliveryStore | None = None, journal: DeliveryJournal | None = None,
                 start_sequence: int = 0, stream_id: str = "stream_01"):
        self._store = store or InMemoryDeliveryStore(start_sequence=start_sequence, stream_id=stream_id)
        self._journal = journal or DeliveryJournal(stream_id=stream_id)

    def next_sequence(self) -> int:
        return self._store.next_sequence()

    @property
    def cursor(self) -> str:
        stream_id = getattr(self._store, "_stream_id", "stream_01")
        seq = getattr(self._store, "_sequence", 0)
        return f"{stream_id}:{seq}"

    @property
    def last_acknowledged_cursor(self) -> str:
        stats = self._store.get_stats()
        return stats.get("lastAckCursor") or f"{getattr(self._store, '_stream_id', 'stream_01')}:0"

    def track(self, event_id: str, subscription_id: str = "_default") -> int:
        seq = self._store.track(event_id, subscription_id)
        self._journal.append({"type": "delivery.tracked", "eventId": event_id, "subscriptionId": subscription_id, "sequence": seq})
        return seq

    def ack(self, event_id: str) -> bool:
        return self._store.ack(event_id)

    def nack(self, event_id: str) -> int | bool:
        return self._store.nack(event_id)

    def get_pending(self) -> list[dict]:
        return self._store.get_pending()

    def get_pending_for_subscription(self, subscription_id: str) -> list[dict]:
        return self._store.get_pending_for_subscription(subscription_id)

    def is_acknowledged(self, event_id: str) -> bool:
        return self._store.is_acknowledged(event_id)

    def is_pending(self, event_id: str) -> bool:
        return self._store.is_pending(event_id)

    def has_attempts_remaining(self, event_id: str, max_attempts: int | None = None) -> bool:
        if max_attempts is None:
            max_attempts = DEFAULT_RETRY["max_attempts"]
        return self._store.has_attempts_remaining(event_id, max_attempts)

    def dead_letter(self, event_id: str, reason: dict | None = None) -> dict | None:
        return self._store.dead_letter(event_id, reason)

    @property
    def dead_lettered(self) -> dict:
        return dict(getattr(self._store, "_dead_lettered", {}))

    @property
    def stats(self) -> dict:
        return self._store.get_stats()
