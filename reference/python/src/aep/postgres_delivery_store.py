import json
from datetime import datetime, timezone

import psycopg


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class PostgresDeliveryStore:
    def __init__(self, url: str, stream_id: str = "stream_01",
                 table_prefix: str = "delivery", drop_on_close: bool = False):
        self._conn = psycopg.connect(url, autocommit=True)
        self._stream_id = stream_id
        self._prefix = table_prefix
        self._drop_on_close = drop_on_close
        self._sequence = 0
        self._init_schema()

    def _t(self, name: str) -> str:
        return f"{self._prefix}_{name}"

    def _init_schema(self):
        with self._conn.cursor() as cur:
            cur.execute(f"""
                CREATE TABLE IF NOT EXISTS {self._t('meta')} (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS {self._t('pending')} (
                    event_id TEXT PRIMARY KEY,
                    subscription_id TEXT NOT NULL,
                    seq BIGINT NOT NULL,
                    cursor TEXT NOT NULL,
                    attempts INT NOT NULL DEFAULT 1,
                    first_attempt_at TEXT NOT NULL,
                    last_attempt_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS {self._t('acked')} (
                    event_id TEXT PRIMARY KEY,
                    cursor TEXT NOT NULL,
                    acked_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS {self._t('dead_lettered')} (
                    event_id TEXT PRIMARY KEY,
                    subscription_id TEXT NOT NULL,
                    seq BIGINT NOT NULL,
                    cursor TEXT NOT NULL,
                    attempts INT NOT NULL,
                    last_attempt_at TEXT NOT NULL,
                    reason JSONB NOT NULL DEFAULT '{{}}',
                    dead_lettered_at TEXT NOT NULL
                );
            """)

    def next_sequence(self) -> int:
        self._sequence += 1
        return self._sequence

    def track(self, event_id: str, subscription_id: str = "_default") -> int:
        seq = self.next_sequence()
        now = _now()
        cursor = f"{self._stream_id}:{seq}"
        with self._conn.cursor() as cur:
            cur.execute(
                f"""INSERT INTO {self._t('pending')}
                    (event_id, subscription_id, seq, cursor, attempts, first_attempt_at, last_attempt_at)
                    VALUES (%s,%s,%s,%s,1,%s,%s)
                    ON CONFLICT (event_id) DO UPDATE SET
                    subscription_id=EXCLUDED.subscription_id, seq=EXCLUDED.seq, cursor=EXCLUDED.cursor,
                    attempts=1, first_attempt_at=EXCLUDED.first_attempt_at, last_attempt_at=EXCLUDED.last_attempt_at""",
                (event_id, subscription_id, seq, cursor, now, now),
            )
        return seq

    def ack(self, event_id: str) -> bool:
        with self._conn.cursor() as cur:
            cur.execute(f"SELECT cursor FROM {self._t('pending')} WHERE event_id = %s", (event_id,))
            row = cur.fetchone()
            if row is None:
                return False
            cursor = row[0]
            cur.execute(f"DELETE FROM {self._t('pending')} WHERE event_id = %s", (event_id,))
            cur.execute(
                f"""INSERT INTO {self._t('acked')} (event_id, cursor, acked_at) VALUES (%s,%s,%s)
                    ON CONFLICT (event_id) DO UPDATE SET cursor=EXCLUDED.cursor, acked_at=EXCLUDED.acked_at""",
                (event_id, cursor, _now()),
            )
            cur.execute(
                f"""INSERT INTO {self._t('meta')} (key, value) VALUES ('last_ack_cursor', %s)
                    ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value""",
                (cursor,),
            )
        return True

    def nack(self, event_id: str) -> int | bool:
        with self._conn.cursor() as cur:
            cur.execute(f"SELECT attempts FROM {self._t('pending')} WHERE event_id = %s", (event_id,))
            row = cur.fetchone()
            if row is None:
                return False
            attempts = row[0] + 1
            cur.execute(
                f"UPDATE {self._t('pending')} SET attempts = %s, last_attempt_at = %s WHERE event_id = %s",
                (attempts, _now(), event_id),
            )
        return attempts

    def dead_letter(self, event_id: str, reason: dict | None = None) -> dict | None:
        if reason is None:
            reason = {}
        with self._conn.cursor() as cur:
            cur.execute(
                f"SELECT subscription_id, seq, cursor, attempts, last_attempt_at FROM {self._t('pending')} WHERE event_id = %s",
                (event_id,),
            )
            row = cur.fetchone()
            if row is None:
                return None
            subscription_id, seq, cursor, attempts, last_attempt_at = row
            cur.execute(f"DELETE FROM {self._t('pending')} WHERE event_id = %s", (event_id,))
            cur.execute(
                f"""INSERT INTO {self._t('dead_lettered')}
                    (event_id, subscription_id, seq, cursor, attempts, last_attempt_at, reason, dead_lettered_at)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                    ON CONFLICT (event_id) DO NOTHING""",
                (event_id, subscription_id, seq, cursor, attempts, last_attempt_at, json.dumps(reason), _now()),
            )
        return {
            "type": "event.dead_lettered",
            "payload": {
                "original_event_id": event_id,
                "subscription_id": subscription_id,
                "cursor": cursor,
                "attempts": attempts,
                "last_attempt_at": last_attempt_at,
                "error": reason.get("error"),
            },
        }

    def _rows_to_pending(self, rows) -> list[dict]:
        return [
            {
                "eventId": r[0],
                "subscriptionId": r[1],
                "sequence": r[2],
                "cursor": r[3],
                "attempts": r[4],
                "firstAttemptAt": r[5],
                "lastAttemptAt": r[6],
            }
            for r in rows
        ]

    def get_pending(self) -> list[dict]:
        with self._conn.cursor() as cur:
            cur.execute(
                f"SELECT event_id, subscription_id, seq, cursor, attempts, first_attempt_at, last_attempt_at "
                f"FROM {self._t('pending')} ORDER BY seq"
            )
            return self._rows_to_pending(cur.fetchall())

    def get_pending_for_subscription(self, subscription_id: str) -> list[dict]:
        with self._conn.cursor() as cur:
            cur.execute(
                f"SELECT event_id, subscription_id, seq, cursor, attempts, first_attempt_at, last_attempt_at "
                f"FROM {self._t('pending')} WHERE subscription_id = %s ORDER BY seq",
                (subscription_id,),
            )
            return self._rows_to_pending(cur.fetchall())

    def get_dead_lettered(self) -> list[dict]:
        with self._conn.cursor() as cur:
            cur.execute(
                f"SELECT event_id, subscription_id, reason FROM {self._t('dead_lettered')} ORDER BY seq"
            )
            rows = cur.fetchall()
        return [
            {
                "eventId": r[0],
                "subscriptionId": r[1],
                "reason": r[2] if isinstance(r[2], dict) else json.loads(r[2]),
            }
            for r in rows
        ]

    def is_acknowledged(self, event_id: str) -> bool:
        with self._conn.cursor() as cur:
            cur.execute(f"SELECT 1 FROM {self._t('acked')} WHERE event_id = %s", (event_id,))
            return cur.fetchone() is not None

    def is_pending(self, event_id: str) -> bool:
        with self._conn.cursor() as cur:
            cur.execute(f"SELECT 1 FROM {self._t('pending')} WHERE event_id = %s", (event_id,))
            return cur.fetchone() is not None

    def has_attempts_remaining(self, event_id: str, max_attempts: int) -> bool:
        with self._conn.cursor() as cur:
            cur.execute(f"SELECT attempts FROM {self._t('pending')} WHERE event_id = %s", (event_id,))
            row = cur.fetchone()
            if row is None:
                return False
            return row[0] < max_attempts

    def get_stats(self) -> dict:
        with self._conn.cursor() as cur:
            cur.execute(f"SELECT COUNT(*) FROM {self._t('pending')}")
            pending = cur.fetchone()[0]
            cur.execute(f"SELECT COUNT(*) FROM {self._t('acked')}")
            acked = cur.fetchone()[0]
            cur.execute(f"SELECT COUNT(*) FROM {self._t('dead_lettered')}")
            dlq = cur.fetchone()[0]
            cur.execute(f"SELECT value FROM {self._t('meta')} WHERE key = 'last_ack_cursor'")
            meta = cur.fetchone()
        return {
            "totalSequences": self._sequence,
            "pending": pending,
            "acknowledged": acked,
            "deadLettered": dlq,
            "lastAckCursor": meta[0] if meta else None,
        }

    def close(self):
        if self._drop_on_close:
            with self._conn.cursor() as cur:
                cur.execute(
                    f"DROP TABLE IF EXISTS {self._t('meta')}, {self._t('pending')}, "
                    f"{self._t('acked')}, {self._t('dead_lettered')}"
                )
        self._conn.close()
