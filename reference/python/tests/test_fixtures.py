import json
from pathlib import Path
from aep import validate_envelope

FIXTURE_DIR = Path(__file__).resolve().parent.parent.parent.parent / "conformance" / "fixtures"


def _read_ndjson(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").strip().split("\n") if line.strip()]


class TestFixtures:
    def test_task_lifecycle_fixture(self):
        events = _read_ndjson(FIXTURE_DIR / "task-lifecycle.ndjson")
        assert len(events) == 3
        assert [e["type"] for e in events] == ["task.submitted", "task.progress", "task.completed"]
        for event in events:
            assert validate_envelope(event) == []

    def test_memory_context_ack_fixture(self):
        events = _read_ndjson(FIXTURE_DIR / "memory-context-ack.ndjson")
        assert len(events) == 4
        assert [e["type"] for e in events] == [
            "subscription.requested", "memory.fact.added", "context.invalidated", "event.acknowledged"
        ]
        for event in events:
            assert validate_envelope(event) == []

    def test_session_flow_fixture(self):
        events = _read_ndjson(FIXTURE_DIR / "session-flow.ndjson")
        assert len(events) == 4
        assert [e["type"] for e in events] == [
            "capabilities.requested", "session.opened", "subscription.requested", "session.closed"
        ]
        for event in events:
            assert validate_envelope(event) == []
