import pytest
from aep import HarmovelaSession


class TestSession:
    def test_lifecycle(self):
        s = HarmovelaSession(id="sess_test", heartbeat_interval_ms=0)
        opened = s.opened()
        assert opened["type"] == "session.opened"
        assert s.is_open() is True
        assert s.is_active() is False

        ready = s.ready({"protocol": "aep", "version": "0.1"})
        assert ready["type"] == "session.ready"
        assert s.is_active() is True

        closed = s.close()
        assert closed["type"] == "session.closed"
        assert s.is_terminal() is True

    def test_error(self):
        s = HarmovelaSession(id="sess_err")
        s.opened()
        s.ready()
        err = s.error("internal_error", "something broke")
        assert err["type"] == "session.error"
        assert err["payload"]["error"]["code"] == "internal_error"
        assert s.is_terminal() is True

    def test_rejects_invalid_transitions(self):
        s = HarmovelaSession(id="sess_bad", heartbeat_interval_ms=0)
        s.opened()
        s.ready()
        s.close()
        with pytest.raises(RuntimeError, match="cannot open"):
            s.opened()
        with pytest.raises(RuntimeError, match="cannot mark"):
            s.ready()

    def test_heartbeat_when_not_ready(self):
        s = HarmovelaSession(id="sess_hb", heartbeat_interval_ms=0)
        assert s.heartbeat() is None
        s.opened()
        assert s.heartbeat() is None
        s.ready()
        assert s.heartbeat()["type"] == "session.heartbeat"
