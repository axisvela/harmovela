from harmovela_harness import HarmovelaHarness

_now = "2026-07-09T10:00:01Z"
_valid_base = {
    "spec_version": "0.2", "id": "evt_input_01", "source": "agent:tester",
    "created_at": "2026-07-09T10:00:00Z",
}


class TestHarness:
    def test_declares_capabilities(self):
        h = HarmovelaHarness(now_fn=lambda: _now)
        [resp] = h.handle({**_valid_base, "type": "capabilities.requested", "payload": {}})
        assert resp["type"] == "capabilities.declared"
        assert resp["causation_id"] == "evt_input_01"
        features = resp["payload"]["features"]
        assert "task_lifecycle" in features
        assert "session_lifecycle" in features
        assert "error_model" in features

    def test_creates_subscriptions(self):
        h = HarmovelaHarness(now_fn=lambda: _now)
        [resp] = h.handle({**_valid_base, "type": "subscription.requested",
                            "payload": {"types": ["memory.*"], "target": "agent:tester"}})
        assert resp["type"] == "subscription.created"
        assert len(h.subscriptions) == 1

    def test_rejects_empty_subscription(self):
        h = HarmovelaHarness(now_fn=lambda: _now)
        [resp] = h.handle({**_valid_base, "type": "subscription.requested",
                            "payload": {"delivery_mode": "best_effort"}})
        assert resp["type"] == "subscription.rejected"
        assert resp["payload"]["error"]["code"] == "subscription_rejected"

    def test_session_opening(self):
        h = HarmovelaHarness(now_fn=lambda: _now)
        responses = h.handle({**_valid_base, "type": "session.opened",
                              "session_id": "sess_test",
                              "payload": {"session_id": "sess_test", "version": "0.1"}})
        assert len(responses) == 1
        assert responses[0]["type"] == "session.ready"
        assert h.session.is_active() is True

    def test_rejects_duplicate_session(self):
        h = HarmovelaHarness(now_fn=lambda: _now)
        h.handle({**_valid_base, "type": "session.opened", "session_id": "sess_dup",
                  "payload": {"session_id": "sess_dup", "version": "0.1"}})
        [resp] = h.handle({**_valid_base, "type": "session.opened", "session_id": "sess_dup",
                            "payload": {"session_id": "sess_dup", "version": "0.1"}})
        assert resp["type"] == "event.rejected"
        assert resp["payload"]["error"]["code"] == "session_error"

    def test_task_submission(self):
        h = HarmovelaHarness(now_fn=lambda: _now)
        [accepted] = h.handle({**_valid_base, "type": "task.submitted",
                                "task_id": "task_lc_01", "payload": {"description": "index docs"}})
        assert accepted["type"] == "task.accepted"
        assert h.tasks["task_lc_01"].state == "accepted"

    def test_task_completion_cleanup(self):
        h = HarmovelaHarness(now_fn=lambda: _now)
        h.handle({**_valid_base, "type": "task.submitted", "task_id": "task_done", "payload": {}})
        h.handle({**_valid_base, "id": "evt_input_02", "type": "task.started", "task_id": "task_done", "payload": {}})
        h.handle({**_valid_base, "id": "evt_input_03", "type": "task.completed", "task_id": "task_done",
                   "payload": {"result": "ok"}})
        assert "task_done" not in h.tasks

    def test_rejects_unknown_task(self):
        h = HarmovelaHarness(now_fn=lambda: _now)
        responses = h.handle({**_valid_base, "type": "task.progress", "task_id": "task_ghost",
                               "payload": {"progress": 0.5}})
        assert responses[0]["type"] == "event.rejected"
        assert responses[0]["payload"]["error"]["code"] == "task_error"

    def test_acknowledges_valid_events(self):
        h = HarmovelaHarness(now_fn=lambda: _now)
        [resp] = h.handle({**_valid_base, "type": "task.progress", "payload": {"progress": 0.25}})
        assert resp["type"] == "event.acknowledged"
        assert resp["payload"]["acknowledged_event_id"] == "evt_input_01"

    def test_rejects_invalid_envelope(self):
        h = HarmovelaHarness(now_fn=lambda: _now)
        [resp] = h.handle({"type": "unknown.event", "payload": {}})
        assert resp["type"] == "event.rejected"
        assert resp["payload"]["error"]["code"] == "invalid_envelope"

    def test_rejects_unsupported_version(self):
        h = HarmovelaHarness(now_fn=lambda: _now)
        [resp] = h.handle({**_valid_base, "spec_version": "9.9", "type": "task.progress", "payload": {}})
        assert resp["type"] == "event.rejected"
        assert resp["payload"]["error"]["code"] == "unsupported_version"
