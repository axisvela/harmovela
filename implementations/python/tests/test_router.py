from axisrobo_harmovela_event import EventRouter


def _make_event(type_: str, **kwargs) -> dict:
    return {"spec_version": "0.2", "id": "evt_01", "type": type_,
            "source": "agent:test", "created_at": "2026-07-09T10:00:00Z", "payload": {}, **kwargs}


class TestRouter:
    def test_dispatch_by_type(self):
        router = EventRouter()
        handled = []
        router.on("task.*", lambda e: handled.append(e["type"]))
        router.dispatch(_make_event("task.submitted"))
        router.dispatch(_make_event("task.completed"))
        router.dispatch(_make_event("memory.fact.added"))
        assert handled == ["task.submitted", "task.completed"]

    def test_collects_responses(self):
        router = EventRouter()
        router.on("task.*", lambda e: {"type": "ack", "payload": {"id": e["id"]}})
        router.on("task.*", lambda e: [{"type": "log", "payload": {"id": e["id"]}}])
        results = router.dispatch(_make_event("task.progress"))
        assert len(results) == 2
        assert results[0]["type"] == "ack"
        assert results[1]["type"] == "log"

    def test_specific_type(self):
        router = EventRouter()
        handled = []
        router.on("task.progress", lambda e: handled.append(e["type"]))
        router.dispatch(_make_event("task.progress"))
        router.dispatch(_make_event("task.completed"))
        assert handled == ["task.progress"]

    def test_match_all(self):
        router = EventRouter()
        handled = []
        router.on(lambda e: handled.append(e["type"]))
        router.dispatch(_make_event("session.opened"))
        router.dispatch(_make_event("task.failed"))
        assert handled == ["session.opened", "task.failed"]
