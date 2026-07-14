import json
import os
from pathlib import Path

CONFORMANCE_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent / "conformance"
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


def should_run(fixture: dict, target_level: str = TARGET_LEVEL) -> bool:
    if LEVEL_ORDER[fixture["level"]] > LEVEL_ORDER[target_level]:
        return False
    if PROFILE:
        fixture_profile = fixture.get("profile")
        if fixture_profile:
            profile_fixtures = set(MANIFEST.get("profiles", {}).get(PROFILE, {}).get("fixtures", []))
            return fixture["path"] in profile_fixtures
    return True


def target_fixtures() -> list[dict]:
    return [fixture for fixture in MANIFEST["fixtures"] if should_run(fixture)]
