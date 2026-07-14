package com.axisrobo.aep;

import com.axisrobo.harmovela.event.envelope.Envelope;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.util.List;
import java.util.Map;

class EnvelopeTest {

    @Test
    void acceptsValidEnvelope() {
        var event = Map.<String, Object>of(
            "spec_version", "0.2",
            "id", "evt_001",
            "type", "task.submitted",
            "source", "agent:test",
            "created_at", "2026-07-09T10:00:00Z",
            "payload", Map.of()
        );
        var errs = Envelope.validate(event);
        assertTrue(errs.isEmpty(), "expected no errors, got " + errs);
    }

    @Test
    void rejectsMissingFields() {
        var event = Map.<String, Object>of();
        var errs = Envelope.validate(event);
        assertFalse(errs.isEmpty());
    }

    @Test
    void rejectsUnknownType() {
        var event = Map.<String, Object>of(
            "spec_version", "0.2",
            "id", "evt_001",
            "type", "not.a.real.type",
            "source", "agent:test",
            "created_at", "2026-07-09T10:00:00Z",
            "payload", Map.of()
        );
        var errs = Envelope.validate(event);
        assertFalse(errs.isEmpty());
    }

    @Test
    void rejectsUnsupportedVersion() {
        var event = Map.<String, Object>of(
            "spec_version", "99.9",
            "id", "evt_001",
            "type", "task.submitted",
            "source", "agent:test",
            "created_at", "2026-07-09T10:00:00Z",
            "payload", Map.of()
        );
        var errs = Envelope.validate(event);
        assertFalse(errs.isEmpty());
        var found = errs.stream().anyMatch(e -> e.contains("unsupported"));
        assertTrue(found, "expected unsupported version error, got " + errs);
    }
}
