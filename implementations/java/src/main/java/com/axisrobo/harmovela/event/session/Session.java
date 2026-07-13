package com.axisrobo.harmovela.event.session;

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
        this.source = source != null ? source : "harmovela:session";
        this.version = version != null ? version : "0.2";
    }

    public String getId() { return id; }
    public State getState() { return state; }
    public boolean isActive() { return state == State.OPENED || state == State.READY; }
    public boolean isOpen() { return state == State.OPENED; }

    public Map<String, Object> opened() {
        if (state != State.CREATED) throw new IllegalStateException("cannot open session in state " + state);
        state = State.OPENED;
        return event("session.opened", Map.of("session_id", id, "version", version));
    }

    public Map<String, Object> ready(Map<String, Object> capabilities) {
        if (state != State.OPENED && state != State.CREATED) {
            throw new IllegalStateException("cannot mark session ready in state " + state);
        }
        if (state == State.CREATED) opened();
        state = State.READY;
        return event("session.ready", Map.of("session_id", id, "capabilities", capabilities));
    }

    public Map<String, Object> close() {
        if (state == State.CLOSED) return null;
        state = State.CLOSED;
        return event("session.closed", Map.of("session_id", id, "reason", "done"));
    }

    private Map<String, Object> event(String type, Map<String, Object> payload) {
        return Map.of(
            "spec_version", version, "id", "evt_sess_" + String.format("%06d", ++eventId), "type", type,
            "source", source, "session_id", id, "created_at", Instant.now().toString(), "payload", payload
        );
    }
}
