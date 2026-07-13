import json
import pytest
from io import StringIO
from axisrobo_harmovela_event.transport import Transport, StdioTransport


class _TestTransport(Transport):
    """Test double for verifying transport behavior without real I/O."""
    def __init__(self):
        super().__init__()
        self.sent: list[str] = []

    def _on_start(self):
        pass

    def _on_stop(self):
        pass

    def _on_send(self, data: str):
        self.sent.append(data)

    def feed(self, line: str):
        self._receive(line)

    def feed_event(self, event: dict):
        self._receive(json.dumps(event))


class TestTransportBase:
    def test_start_stop_lifecycle(self):
        t = _TestTransport()
        assert not t.is_started
        t.start()
        assert t.is_started
        t.stop()
        assert not t.is_started

    def test_receive_parses_ndjson_events(self):
        t = _TestTransport()
        t.start()
        t.feed('{"type":"test_event","payload":{"key":"value"}}')
        assert len(t.events) == 1
        assert t.events[0] == {"type": "test_event", "payload": {"key": "value"}}

    def test_ignore_empty_lines(self):
        t = _TestTransport()
        t.start()
        t.feed("")
        t.feed("   ")
        t.feed("\n")
        assert len(t.events) == 0
        assert len(t.errors) == 0

    def test_malformed_json_emits_error(self):
        t = _TestTransport()
        t.start()
        t.feed("not valid json {{{")
        assert len(t.events) == 0
        assert len(t.errors) == 1
        assert isinstance(t.errors[0], json.JSONDecodeError)

    def test_send_line_appends_newline(self):
        t = _TestTransport()
        t.start()
        t._send_line('{"type":"out"}')
        assert len(t.sent) == 1
        assert t.sent[0] == '{"type":"out"}\n'

    def test_send_json_stringifies_and_sends(self):
        t = _TestTransport()
        t.start()
        t._send_json({"type": "out", "payload": {}})
        assert len(t.sent) == 1
        assert t.sent[0] == '{"type": "out", "payload": {}}'

    def test_double_start_is_noop(self):
        t = _TestTransport()
        t.start()
        t.start()
        assert t.is_started

    def test_stop_when_not_started_is_noop(self):
        t = _TestTransport()
        t.stop()
        assert not t.is_started


class TestStdioTransport:
    def test_send_writes_to_output(self):
        output = StringIO()
        error_output = StringIO()
        t = StdioTransport(output=output, error_output=error_output)
        t.start()
        t._send_line('{"type":"hello"}')
        assert output.getvalue() == '{"type":"hello"}\n'

    def test_input_is_readable_for_manual_feed(self):
        output = StringIO()
        error_output = StringIO()
        t = StdioTransport(output=output, error_output=error_output)
        t.start()
        t.feed('{"type":"incoming"}')
        assert len(t.events) == 1
        assert t.events[0] == {"type": "incoming"}
