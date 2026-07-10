import threading
import time

import pytest
from aep.transport.websocket import WsServerTransport, WsClientTransport


class TestWsServerTransport:
    @pytest.fixture
    def server(self):
        transport = WsServerTransport(port=0)
        t = threading.Thread(target=transport.start, daemon=True)
        t.start()
        for _ in range(30):
            if transport.port > 0:
                break
            time.sleep(0.02)
        yield transport
        transport.stop()

    def test_server_starts_and_listens(self, server):
        assert server.port > 0
        assert server.is_started

    def test_client_connect_and_exchange(self, server):
        received = []
        server.on_event = lambda event: received.append(event)

        client = WsClientTransport(url=f"ws://127.0.0.1:{server.port}/aep")
        client.start()
        time.sleep(0.1)

        event = {"id": "evt_01", "type": "test.event", "payload": "hello"}
        client.send(event)
        time.sleep(0.15)

        assert len(received) >= 1
        assert received[0]["type"] == "test.event"
        assert received[0]["payload"] == "hello"

        client.stop()

    def test_bidirectional(self, server):
        server_received = []
        server.on_event = lambda event: server_received.append(event)

        client = WsClientTransport(url=f"ws://127.0.0.1:{server.port}/aep")
        client_received = []
        client.on_event = lambda event: client_received.append(event)
        client.start()
        time.sleep(0.1)

        client.send({"id": "01", "type": "c2s", "payload": "ping"})
        time.sleep(0.1)
        server.send({"id": "02", "type": "s2c", "payload": "pong"})
        time.sleep(0.1)

        assert len(server_received) >= 1
        assert server_received[0]["type"] == "c2s"
        assert len(client_received) >= 1
        assert client_received[0]["type"] == "s2c"

        client.stop()

    def test_shutdown(self, server):
        port = server.port
        server.stop()
        assert not server.is_started
