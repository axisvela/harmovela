import json
import os
from pathlib import Path

import pytest

from aep import validate_envelope
from aep.harness import HarmovelaHarness
from aep.schema_validator import is_valid_by_schema

CONFORMANCE_DIR = Path(__file__).resolve().parent.parent.parent.parent / "conformance"
LEVEL_ORDER = {"HARMOVELA-C0": 0, "HARMOVELA-C1": 1, "HARMOVELA-C2": 2, "HARMOVELA-C3": 3}

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
TARGET_LEVEL = MANIFEST.get("default_target_level", "HARMOVELA-C1")
PROFILE = os.environ.get("HARMOVELA_PROFILE")


def _should_run(fixture: dict, target_level: str = TARGET_LEVEL) -> bool:
    if LEVEL_ORDER[fixture["level"]] > LEVEL_ORDER[target_level]:
        return False
    if PROFILE:
        fixture_profile = fixture.get("profile")
        if fixture_profile:
            profile_fixtures = set(MANIFEST.get("profiles", {}).get(PROFILE, {}).get("fixtures", []))
            return fixture["path"] in profile_fixtures
    return True


def _target_fixtures() -> list[dict]:
    return [fixture for fixture in MANIFEST["fixtures"] if _should_run(fixture)]


def test_conformance_manifest_declares_known_draft_levels():
    assert MANIFEST["levels"] == ["HARMOVELA-C0", "HARMOVELA-C1", "HARMOVELA-C2", "HARMOVELA-C3"]
    assert MANIFEST["default_target_level"] == "HARMOVELA-C3"


@pytest.mark.parametrize("fixture", _target_fixtures(), ids=lambda f: f["path"])
def test_conformance_fixture_validation(fixture: dict):
    events = _read_ndjson(CONFORMANCE_DIR / fixture["path"])

    if fixture["expectation"] == "reject_some":
        rejected = False
        harness = HarmovelaHarness()
        for event in events:
            payload_invalid = event["type"] in PAYLOAD_VALIDATED_TYPES and not is_valid_by_schema(event, "payloads")
            harness_rejected = any(response["type"] == "event.rejected" for response in (harness.handle(event) or []))
            if validate_envelope(event) or not is_valid_by_schema(event, "envelope") or payload_invalid or harness_rejected:
                rejected = True
        assert rejected, "expected at least one event rejection"
        return

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
    harness = HarmovelaHarness()
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
