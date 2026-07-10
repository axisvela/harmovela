import json
import queue
import threading
from concurrent.futures import ThreadPoolExecutor

import grpc

from . import aep_pb2
from . import aep_pb2_grpc
from .base import Transport


class _StreamHandler:
    def __init__(self, stream_id, context, transport):
        self.stream_id = stream_id
        self.context = context
        self.transport = transport
        self.send_queue = queue.Queue()

    def send(self, data):
        self.send_queue.put(data)

    def close(self):
        self.send_queue.put(None)


class _AepServicer(aep_pb2_grpc.AepTransportServicer):
    def __init__(self, transport):
        self._transport = transport

    def Stream(self, request_iterator, context):
        stream_id = self._transport._next_stream_id
        self._transport._next_stream_id += 1
        handler = _StreamHandler(stream_id, context, self._transport)
        self._transport._add_stream(handler)

        if self._transport.connection_callback:
            try:
                self._transport.connection_callback(
                    {"stream_id": stream_id}
                )
            except Exception:
                pass

        def read_requests():
            try:
                for msg in request_iterator:
                    try:
                        event = json.loads(msg.json_payload)
                        if self._transport.events_callback:
                            try:
                                self._transport.events_callback(event)
                            except Exception:
                                pass
                        self._transport.on_event(event)
                    except json.JSONDecodeError as err:
                        self._transport.on_error(err)
            except Exception:
                pass

        read_thread = threading.Thread(target=read_requests, daemon=True)
        read_thread.start()

        try:
            while True:
                data = handler.send_queue.get()
                if data is None:
                    break
                yield aep_pb2.AepMessage(json_payload=json.dumps(data))
        finally:
            self._transport._remove_stream(handler)


class GrpcServerTransport(Transport):
    def __init__(self, host="127.0.0.1", port=0, options=None):
        super().__init__()
        if options is None:
            options = {}
        self.host = host
        self._port = port
        self._server = None
        self._streams = {}
        self._streams_lock = threading.Lock()
        self._next_stream_id = 0
        self.events_callback = None
        self.connection_callback = None

    @property
    def port(self):
        return self._port

    def _on_start(self):
        self._server = grpc.server(ThreadPoolExecutor(max_workers=10))

        servicer = _AepServicer(self)
        aep_pb2_grpc.add_AepTransportServicer_to_server(servicer, self._server)

        self._port = self._server.add_insecure_port(f"{self.host}:{self._port}")
        self._server.start()

    def _on_stop(self):
        with self._streams_lock:
            for handler in list(self._streams.values()):
                handler.close()
            self._streams.clear()

        if self._server:
            self._server.stop(grace=None)
            self._server = None

    def _on_send(self, data):
        if isinstance(data, str):
            data = json.loads(data)
        with self._streams_lock:
            for handler in list(self._streams.values()):
                handler.send(data)

    def _add_stream(self, handler):
        with self._streams_lock:
            self._streams[handler.stream_id] = handler

    def _remove_stream(self, handler):
        with self._streams_lock:
            self._streams.pop(handler.stream_id, None)


class GrpcClientTransport(Transport):
    def __init__(self, address="127.0.0.1:0", metadata=None, options=None):
        super().__init__()
        self.address = address
        self._metadata = metadata or {}
        self._options = options or {}
        self._channel = None
        self._stub = None
        self._send_queue = None
        self._stream_thread = None
        self.events_callback = None

    def _on_start(self):
        self._channel = grpc.insecure_channel(self.address)
        self._stub = aep_pb2_grpc.AepTransportStub(self._channel)
        self._send_queue = queue.Queue()

        self._stream_thread = threading.Thread(
            target=self._run_stream, daemon=True
        )
        self._stream_thread.start()

    def _run_stream(self):
        def request_generator():
            while True:
                try:
                    data = self._send_queue.get(timeout=0.1)
                    if data is None:
                        return
                    yield aep_pb2.AepMessage(json_payload=json.dumps(data))
                except queue.Empty:
                    if not self._started:
                        return
                    continue

        try:
            responses = self._stub.Stream(request_generator())
            for msg in responses:
                try:
                    event = json.loads(msg.json_payload)
                    if self.events_callback:
                        try:
                            self.events_callback(event)
                        except Exception:
                            pass
                    self.on_event(event)
                except json.JSONDecodeError as err:
                    self.on_error(err)
        except grpc.RpcError:
            pass
        except Exception as err:
            self.on_error(err)

    def _on_send(self, data):
        if self._send_queue is None:
            return
        self._send_queue.put(data)

    def _on_stop(self):
        if self._send_queue is not None:
            self._send_queue.put(None)
        if self._channel:
            self._channel.close()
            self._channel = None
