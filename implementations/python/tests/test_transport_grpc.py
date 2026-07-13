import json
import threading
import time

import grpc
import pytest

from axisrobo_harmovela_event.transport.grpc import GrpcServerTransport, GrpcClientTransport


def _event(t, payload=None):
    return {"type": t, "payload": payload or {}}


class TestGrpcServerTransport:
    def test_server_start(self):
        server = GrpcServerTransport(host="127.0.0.1", port=0)
        server.start()
        assert server.port > 0
        assert server.is_started
        server.stop()

    def test_client_exchange(self):
        server = GrpcServerTransport(host="127.0.0.1", port=0)
        received = []
        connections = []

        def on_message(event):
            received.append(event)

        def on_connection(info):
            connections.append(info)

        server.events_callback = on_message
        server.connection_callback = on_connection

        server.start()
        port = server.port

        client = GrpcClientTransport(address=f"127.0.0.1:{port}")
        client.start()

        time.sleep(0.2)

        client.send({"type": "test.hello", "payload": {"msg": "world"}})
        time.sleep(0.2)

        assert len(received) >= 1
        assert received[0]["type"] == "test.hello"
        assert received[0]["payload"]["msg"] == "world"
        assert len(connections) >= 1

        client.stop()
        server.stop()

    def test_bidirectional(self):
        server = GrpcServerTransport(host="127.0.0.1", port=0)
        server_received = []
        client_received = []

        def on_server_message(event):
            server_received.append(event)

        server.events_callback = on_server_message

        server.start()
        port = server.port

        client = GrpcClientTransport(address=f"127.0.0.1:{port}")
        client_received_lock = threading.Lock()

        def on_client_message(event):
            with client_received_lock:
                client_received.append(event)

        client.events_callback = on_client_message
        client.start()

        time.sleep(0.2)

        client.send({"type": "client.to.server", "payload": {"n": 1}})
        time.sleep(0.2)

        server.send({"type": "server.to.client", "payload": {"n": 2}})
        time.sleep(0.2)

        client.send({"type": "client.to.server", "payload": {"n": 3}})
        time.sleep(0.2)

        server.send({"type": "server.to.client", "payload": {"n": 4}})
        time.sleep(0.2)

        assert len(server_received) >= 2
        assert server_received[0]["type"] == "client.to.server"
        assert server_received[1]["type"] == "client.to.server"

        with client_received_lock:
            assert len(client_received) >= 2
            assert client_received[0]["type"] == "server.to.client"
            assert client_received[1]["type"] == "server.to.client"

        client.stop()
        server.stop()

    def test_shutdown(self):
        server = GrpcServerTransport(host="127.0.0.1", port=0)
        server.start()
        port = server.port

        client = GrpcClientTransport(address=f"127.0.0.1:{port}")
        client.start()
        time.sleep(0.2)

        client.stop()
        server.stop()

        assert not client.is_started
        assert not server.is_started
