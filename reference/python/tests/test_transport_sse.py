import json
import threading
import time
import urllib.request

import pytest
from aep.transport.sse import SseServerTransport


class TestSseServerTransport:
    @pytest.fixture
    def server(self):
        transport = SseServerTransport(port=0)
        t = threading.Thread(target=transport.start, daemon=True)
        t.start()
        time.sleep(0.1)
        yield transport
        transport.stop()

    def test_serves_text_event_stream(self, server):
        url = f"http://127.0.0.1:{server.port}/aep/events"
        req = urllib.request.Request(url, headers={"Accept": "text/event-stream"})
        conn = urllib.request.urlopen(req, timeout=2)
        content_type = conn.headers.get("Content-Type", "")
        assert "text/event-stream" in content_type

    def test_ingest_endpoint_accepts_post_events(self, server):
        url = f"http://127.0.0.1:{server.port}/aep/events"
        events = [
            json.dumps({"id": "evt_01", "type": "test.event", "aep_version": "0.1", "source": "test", "created_at": "2024-01-01T00:00:00Z", "payload": {}}),
            json.dumps({"id": "evt_02", "type": "test.event", "aep_version": "0.1", "source": "test", "created_at": "2024-01-01T00:00:00Z", "payload": {}}),
        ]
        body = "\n".join(events).encode("utf-8")
        req = urllib.request.Request(url, data=body, method="POST")
        req.add_header("Content-Type", "application/x-ndjson")
        response = urllib.request.urlopen(req, timeout=2)
        assert response.status == 202
        result = json.loads(response.read())
        assert result["accepted"] == 2
        assert result["rejected"] == 0

    def test_rejects_invalid_json(self, server):
        url = f"http://127.0.0.1:{server.port}/aep/events"
        body = b'{"id": "evt_01", invalid json here\n{"id": "evt_02", "type": "test"}'
        req = urllib.request.Request(url, data=body, method="POST")
        req.add_header("Content-Type", "application/x-ndjson")
        response = urllib.request.urlopen(req, timeout=2)
        result = json.loads(response.read())
        assert result["rejected"] > 0
