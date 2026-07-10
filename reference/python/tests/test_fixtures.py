import json
from pathlib import Path

import pytest

from aep import validate_envelope
from aep.harness import AepHarness
from aep.schema_validator import is_valid_by_schema

CONFORMANCE_DIR = Path(__file__).resolve().parent.parent.parent.parent / "conformance"
LEVEL_ORDER = {"AEP-C0": 0, "AEP-C1": 1, "AEP-C2": 2, "AEP-C3": 3}

PAYLOAD_VALIDATED_TYPES = frozenset({
    "context.invalidated", "context.updated", "context.snapshot.requested", "context.snapshot.ready",
    "memory.fact.invalidated", "memory.fact.added", "memory.fact.updated",
    "belief.revised", "belief.conflict.detected",
    "freshness.expired", "freshness.window.changed",
    "delegation.requested", "delegation.accepted", "delegation.rejected",
    "delegation.handoff.completed", "delegation.escalated",
    "interruption.requested", "interruption.acknowledged", "interruption.saved",
    "interruption.resumed", "interruption.cancelled",
    "compensation.requested", "compensation.completed",
    "provenance.attestation.added", "provenance.attestation.revoked", "provenance.chain.truncated",
})


def _read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _read_ndjson(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").strip().split("\n") if line.strip()]


MANIFEST = _read_json(CONFORMANCE_DIR / "manifest.json")
TARGET_LEVEL = MANIFEST.get("default_target_level", "AEP-C1")


def _should_run(fixture: dict, target_level: str = TARGET_LEVEL) -> bool:
    return LEVEL_ORDER[fixture["level"]] <= LEVEL_ORDER[target_level]


def _target_fixtures() -> list[dict]:
    return [fixture for fixture in MANIFEST["fixtures"] if _should_run(fixture)]


def test_conformance_manifest_declares_known_draft_levels():
    assert MANIFEST["levels"] == ["AEP-C0", "AEP-C1", "AEP-C2", "AEP-C3"]
    assert MANIFEST["default_target_level"] == "AEP-C3"


@pytest.mark.parametrize("fixture", _target_fixtures(), ids=lambda f: f["path"])
def test_conformance_fixture_validation(fixture: dict):
    events = _read_ndjson(CONFORMANCE_DIR / fixture["path"])

    assert [event["type"] for event in events] == fixture["expected_types"]
    for event in events:
        assert validate_envelope(event) == []
        assert is_valid_by_schema(event, "envelope") is True
        if event["type"] in PAYLOAD_VALIDATED_TYPES:
            assert is_valid_by_schema(event, "payloads") is True, \
                f"payload schema validation failed for {event['type']}"


@pytest.mark.parametrize(
    "fixture",
    [fixture for fixture in _target_fixtures() if fixture["expectation"] in ("stateful_flow", "delivery_e2e")],
    ids=lambda f: f["path"],
)
def test_conformance_stateful_flows_are_accepted(fixture: dict):
    harness = AepHarness()
    events = _read_ndjson(CONFORMANCE_DIR / fixture["path"])

    for index, event in enumerate(events):
        responses = harness.handle(event) or []
        rejected = [response for response in responses if response["type"] == "event.rejected"]
        assert rejected == [], f"event {index} rejected: {rejected}"

    if fixture["expectation"] == "delivery_e2e":
        expected_stats = fixture.get("expected_stats", {})
        stats = harness._delivery.stats
        for key, value in expected_stats.items():
            assert stats.get(key) == value, f"delivery stat {key}: expected {value}, got {stats.get(key)}"
