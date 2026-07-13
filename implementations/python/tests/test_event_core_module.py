from axisrobo_harmovela_event import (
    EventRouter,
    HarmovelaSession,
    is_standard_event_type,
    matches_type,
    subscription_matches,
    validate_envelope,
)


def test_event_public_api_validates_event_envelopes_and_excludes_task_registry_types():
    event = {
        "spec_version": "0.2",
        "id": "evt_01",
        "type": "session.opened",
        "source": "agent:test",
        "created_at": "2026-07-09T10:00:00Z",
        "payload": {},
    }
    assert validate_envelope(event) == []
    assert is_standard_event_type("task.submitted") is False


def test_event_public_api_provides_session_subscription_and_routing_behavior():
    session = HarmovelaSession(id="sess_event")
    assert session.opened()["type"] == "session.opened"
    assert session.ready()["type"] == "session.ready"
    assert matches_type("session.*", "session.ready") is True
    assert subscription_matches({"types": "session.*"}, {"type": "session.ready"}) is True

    router = EventRouter()
    router.on("session.*", lambda event: {"type": "event.acknowledged", "payload": {"id": event["id"]}})
    assert len(router.dispatch({"type": "session.ready", "id": "evt_01"})) == 1
