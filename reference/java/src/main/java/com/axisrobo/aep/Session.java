package com.axisrobo.aep;

import java.time.Instant;
import java.util.Map;

public class Session {
    public enum State { CREATED, OPENED, READY, CLOSED, ERROR }

    private final String id;
    private final String source;
    private final String version;
    private State state = State.CREATED;
    private int eventId;

    public Session(String id, String source, String version) {
        this.id = id != null ? id : "sess_" + System.currentTimeMillis();
        this.source = source != null ? source : "aep:session";
        this.version = version != null ? version : "0.1";
    }

    public String getId() { return id; }
    public State getState() { return state; }
    public boolean isActive() { return state == State.OPENED || state == State.READY; }
    public boolean isOpen() { return state == State.OPENED; }

    private String nextEventId() {
        eventId++;
        return "evt_sess_" + String.format("%06d", eventId);
    }

    private static String now() { return Instant.now().toString(); }

    public Map<String, Object> opened() {
        if (state != State.CREATED) throw new IllegalStateException("cannot open session in state " + state);
        state = State.OPENED;
        var ts = now();
        return Map.<String, Object>of(
            "aep_version", version, "id", nextEventId(), "type", "session.opened",
            "source", source, "session_id", id, "created_at", ts,
            "payload", Map.of("session_id", id, "version", version)
        );
    }

    public Map<String, Object> ready(Map<String, Object> capabilities) {
        if (state != State.OPENED && state != State.CREATED)
            throw new IllegalStateException("cannot mark session ready in state " + state);
        if (state == State.CREATED) opened();
        state = State.READY;
        var ts = now();
        return Map.<String, Object>of(
            "aep_version", version, "id", nextEventId(), "type", "session.ready",
            "source", source, "session_id", id, "created_at", ts,
            "payload", Map.of("session_id", id, "capabilities", capabilities)
        );
    }

    public Map<String, Object> close() {
        if (state == State.CLOSED) return null;
        state = State.CLOSED;
        var ts = now();
        return Map.<String, Object>of(
            "aep_version", version, "id", nextEventId(), "type", "session.closed",
            "source", source, "session_id", id, "created_at", ts,
            "payload", Map.of("session_id", id, "reason", "done")
        );
    }
}
