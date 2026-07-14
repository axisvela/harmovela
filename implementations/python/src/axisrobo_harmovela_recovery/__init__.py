RECOVERY_EVENT_TYPES = frozenset({
    "interruption.requested",
    "interruption.acknowledged",
    "interruption.saved",
    "interruption.resumed",
    "interruption.cancelled",
    "compensation.requested",
    "compensation.completed",
})


def is_recovery_event_type(type_: str) -> bool:
    return type_ in RECOVERY_EVENT_TYPES


from axisrobo_harmovela_recovery.delivery import DeliveryTracker, retry_delay, DEFAULT_RETRY
from axisrobo_harmovela_recovery.delivery_journal import DeliveryJournal
from axisrobo_harmovela_recovery.delivery_store import InMemoryDeliveryStore
from axisrobo_harmovela_recovery.sqlite_delivery_store import SqliteDeliveryStore
from axisrobo_harmovela_recovery.postgres_delivery_store import PostgresDeliveryStore

__all__ = [
    "RECOVERY_EVENT_TYPES", "is_recovery_event_type",
    "DeliveryTracker", "retry_delay", "DEFAULT_RETRY",
    "DeliveryJournal",
    "InMemoryDeliveryStore",
    "SqliteDeliveryStore",
    "PostgresDeliveryStore",
]
