from axisrobo_harmovela_event import validate_envelope, is_standard_event_type


class TestEnvelope:
    def test_accepts_valid_envelope(self):
        errors = validate_envelope({
            "spec_version": "0.2",
            "id": "evt_01",
            "type": "task.progress",
            "source": "tool:crawler",
            "created_at": "2026-07-09T10:00:00Z",
            "payload": {"progress": 0.5},
        })
        assert errors == []

    def test_rejects_missing_fields(self):
        errors = validate_envelope({"type": "task.progress", "payload": {}})
        joined = "\n".join(errors)
        assert "spec_version" in joined
        assert "id" in joined
        assert "source" in joined
        assert "created_at" in joined

    def test_envelope_validation_does_not_own_dimension_type_registry(self):
        errors = validate_envelope({
            "spec_version": "0.2", "id": "evt_01", "type": "custom.event.created",
            "source": "agent:test", "created_at": "2026-07-09T10:00:00Z", "payload": {},
        })
        assert is_standard_event_type("custom.event.created") is False
        assert errors == []

    def test_rejects_bad_created_at(self):
        errors = validate_envelope({
            "spec_version": "0.2", "id": "evt_01", "type": "task.progress",
            "source": "s", "created_at": "not-a-date", "payload": {},
        })
        joined = "\n".join(errors)
        assert "ISO-compatible" in joined

    def test_rejects_bad_delivery_mode(self):
        errors = validate_envelope({
            "spec_version": "0.2", "id": "evt_01", "type": "task.progress",
            "source": "s", "created_at": "2026-07-09T10:00:00Z", "payload": {},
            "delivery": {"mode": "exactly_once"},
        })
        joined = "\n".join(errors)
        assert "delivery.mode" in joined
