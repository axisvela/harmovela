import json
from pathlib import Path
from axisrobo_harmovela_event import validate_envelope_schema, validate_subscription_schema, is_valid_by_schema
from axisrobo_harmovela_event import validate_envelope

FIXTURE_DIR = Path(__file__).resolve().parent.parent.parent.parent / "conformance" / "fixtures"


def _read_ndjson(path):
    return [json.loads(line) for line in path.read_text("utf-8").strip().split("\n") if line.strip()]


class TestSchema:
    def test_fixtures_pass_schema(self):
        for name in ("task-lifecycle", "memory-context-ack", "session-flow"):
            events = _read_ndjson(FIXTURE_DIR / f"{name}.ndjson")
            for event in events:
                assert is_valid_by_schema(event, "envelope"), f"{event['type']} in {name} should pass schema"

    def test_schema_rejects_missing_fields(self):
        errors = validate_envelope_schema({"type": "task.progress", "payload": {}})
        assert len(errors) > 0

    def test_runtime_and_schema_agree(self):
        events = _read_ndjson(FIXTURE_DIR / "task-lifecycle.ndjson")
        for event in events:
            assert validate_envelope(event) == []
            assert is_valid_by_schema(event, "envelope") is True

    def test_schema_catches_bad_delivery_mode(self):
        event = {
            "spec_version": "0.2", "id": "evt_01", "type": "task.progress",
            "source": "tool:crawler", "created_at": "2026-07-09T10:00:00Z", "payload": {},
            "delivery": {"mode": "exactly_once"},
        }
        assert is_valid_by_schema(event, "envelope") is False

    def test_subscription_filter_valid(self):
        assert is_valid_by_schema({
            "types": ["memory.*", "context.*"],
            "source": "memory:main",
            "target": "agent:researcher",
            "delivery_mode": "at_least_once",
        }, "subscription") is True

    def test_subscription_filter_rejects_bad_delivery_mode(self):
        assert is_valid_by_schema({
            "types": ["memory.*"],
            "delivery_mode": "invalid",
        }, "subscription") is False
