import json
import sqlite3
from datetime import datetime, timezone


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class SqliteDeliveryStore:
    def __init__(self, url: str, stream_id: str = "stream_01"):
        self._db = sqlite3.connect(url, check_same_thread=False)
        self._db.row_factory = sqlite3.Row
        self._stream_id = stream_id
        self._sequence = 0
        self._init_schema()

    def _init_schema(self):
        self._db.executescript("""
            CREATE TABLE IF NOT EXISTS delivery_pending (
                event_id TEXT PRIMARY KEY,
                subscription_id TEXT NOT NULL,
                seq INTEGER NOT NULL,
                cursor TEXT NOT NULL,
                attempts INTEGER NOT NULL DEFAULT 1,
                first_attempt_at TEXT NOT NULL,
                last_attempt_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS delivery_acked (
                event_id TEXT PRIMARY KEY,
                cursor TEXT NOT NULL,
                acked_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS delivery_dead_lettered (
                event_id TEXT PRIMARY KEY,
                subscription_id TEXT NOT NULL,
                seq INTEGER NOT NULL,
                cursor TEXT NOT NULL,
                attempts INTEGER NOT NULL,
                last_attempt_at TEXT NOT NULL,
                reason TEXT NOT NULL DEFAULT '{}',
                dead_lettered_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS delivery_meta (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        """)

    def next_sequence(self) -> int:
        self._sequence += 1
        return self._sequence

    def track(self, event_id: str, subscription_id: str = "_default") -> int:
        seq = self.next_sequence()
        now = _now()
        cursor = f"{self._stream_id}:{seq}"
        self._db.execute(
            "INSERT INTO delivery_pending (event_id, subscription_id, seq, cursor, attempts, first_attempt_at, last_attempt_at) VALUES (?,?,?,?,1,?,?)",
            (event_id, subscription_id, seq, cursor, now, now),
        )
        self._db.commit()
        return seq

    def ack(self, event_id: str) -> bool:
        row = self._db.execute("SELECT * FROM delivery_pending WHERE event_id = ?", (event_id,)).fetchone()
        if row is None:
            return False
        self._db.execute("DELETE FROM delivery_pending WHERE event_id = ?", (event_id,))
        self._db.execute("INSERT INTO delivery_acked (event_id, cursor, acked_at) VALUES (?,?,?)",
                         (event_id, row["cursor"], _now()))
        self._db.execute("INSERT OR REPLACE INTO delivery_meta (key, value) VALUES ('last_ack_cursor', ?)",
                         (row["cursor"],))
        self._db.commit()
        return True

    def nack(self, event_id: str) -> int | bool:
        row = self._db.execute("SELECT * FROM delivery_pending WHERE event_id = ?", (event_id,)).fetchone()
        if row is None:
            return False
        attempts = row["attempts"] + 1
        self._db.execute("UPDATE delivery_pending SET attempts = ?, last_attempt_at = ? WHERE event_id = ?",
                         (attempts, _now(), event_id))
        self._db.commit()
        return attempts

    def dead_letter(self, event_id: str, reason: dict | None = None) -> dict | None:
        row = self._db.execute("SELECT * FROM delivery_pending WHERE event_id = ?", (event_id,)).fetchone()
        if row is None:
            return None
        if reason is None:
            reason = {}
        self._db.execute("DELETE FROM delivery_pending WHERE event_id = ?", (event_id,))
        self._db.execute(
            "INSERT INTO delivery_dead_lettered (event_id, subscription_id, seq, cursor, attempts, last_attempt_at, reason, dead_lettered_at) VALUES (?,?,?,?,?,?,?,?)",
            (event_id, row["subscription_id"], row["seq"], row["cursor"], row["attempts"],
             row["last_attempt_at"], json.dumps(reason), _now()),
        )
        self._db.commit()
        return {
            "type": "event.dead_lettered",
            "payload": {
                "original_event_id": event_id,
                "subscription_id": row["subscription_id"],
                "cursor": row["cursor"],
                "attempts": row["attempts"],
                "last_attempt_at": row["last_attempt_at"],
                "error": reason.get("error"),
            },
        }

    def get_pending(self) -> list[dict]:
        rows = self._db.execute("SELECT * FROM delivery_pending ORDER BY seq").fetchall()
        return [self._row_to_pending(r) for r in rows]

    def get_pending_for_subscription(self, subscription_id: str) -> list[dict]:
        rows = self._db.execute(
            "SELECT * FROM delivery_pending WHERE subscription_id = ? ORDER BY seq", (subscription_id,)
        ).fetchall()
        return [self._row_to_pending(r) for r in rows]

    def get_dead_lettered(self) -> list[dict]:
        rows = self._db.execute(
            "SELECT event_id, subscription_id, reason FROM delivery_dead_lettered ORDER BY seq"
        ).fetchall()
        return [
            {
                "eventId": r["event_id"],
                "subscriptionId": r["subscription_id"],
                "reason": json.loads(r["reason"]),
            }
            for r in rows
        ]

    def is_acknowledged(self, event_id: str) -> bool:
        return self._db.execute("SELECT 1 FROM delivery_acked WHERE event_id = ?", (event_id,)).fetchone() is not None

    def is_pending(self, event_id: str) -> bool:
        return self._db.execute("SELECT 1 FROM delivery_pending WHERE event_id = ?", (event_id,)).fetchone() is not None

    def has_attempts_remaining(self, event_id: str, max_attempts: int) -> bool:
        row = self._db.execute("SELECT attempts FROM delivery_pending WHERE event_id = ?", (event_id,)).fetchone()
        if row is None:
            return False
        return row["attempts"] < max_attempts

    def get_stats(self) -> dict:
        pending = self._db.execute("SELECT COUNT(*) as c FROM delivery_pending").fetchone()["c"]
        acked = self._db.execute("SELECT COUNT(*) as c FROM delivery_acked").fetchone()["c"]
        dlq = self._db.execute("SELECT COUNT(*) as c FROM delivery_dead_lettered").fetchone()["c"]
        meta = self._db.execute("SELECT value FROM delivery_meta WHERE key = 'last_ack_cursor'").fetchone()
        return {
            "totalSequences": self._sequence,
            "pending": pending,
            "acknowledged": acked,
            "deadLettered": dlq,
            "lastAckCursor": meta["value"] if meta else None,
        }

    def close(self):
        self._db.close()

    @staticmethod
    def _row_to_pending(row) -> dict:
        return {
            "eventId": row["event_id"],
            "subscriptionId": row["subscription_id"],
            "sequence": row["seq"],
            "cursor": row["cursor"],
            "attempts": row["attempts"],
            "firstAttemptAt": row["first_attempt_at"],
            "lastAttemptAt": row["last_attempt_at"],
        }
