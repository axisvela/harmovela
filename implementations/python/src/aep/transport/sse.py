import json
import socket
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler


class _SseRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/aep/events" or self.path.startswith("/aep/events?"):
            self._handle_stream()
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"not found")

    def do_POST(self):
        if self.path == "/aep/events" or self.path.startswith("/aep/events?"):
            self._handle_ingest()
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"not found")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Last-Event-ID")
        self.end_headers()

    def _handle_stream(self):
        transport = self.server._aep_transport
        client_id = transport._next_client_id
        transport._next_client_id += 1

        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

        client_entry = {"wfile": self.wfile, "client_id": client_id}
        transport._clients[client_id] = client_entry

        transport.emit("connection", {"clientId": client_id})

        heartbeat = None
        if transport._heartbeat_interval > 0:
            heartbeat = threading.Timer(
                transport._heartbeat_interval / 1000.0,
                transport._send_heartbeat,
                args=[client_id]
            )
            heartbeat.daemon = True
            heartbeat.start()

        try:
            while True:
                line = self.rfile.readline()
                if not line:
                    break
        except (ConnectionError, OSError):
            pass
        finally:
            if heartbeat:
                heartbeat.cancel()
            transport._clients.pop(client_id, None)
            transport.emit("disconnection", {"clientId": client_id})

    def _handle_ingest(self):
        transport = self.server._aep_transport
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length > 0:
            body = self.rfile.read(content_length).decode("utf-8")
        else:
            body = ""

        lines = [line for line in body.split("\n") if line.strip()]
        accepted = []
        errors = []

        for line in lines:
            try:
                event = json.loads(line)
                accepted.append(event)
                transport.emit("message", event)
            except json.JSONDecodeError as err:
                errors.append({"line": line[:100], "error": str(err)})

        self.send_response(202)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        response = json.dumps({
            "accepted": len(accepted),
            "rejected": len(errors),
            "errors": errors,
        })
        self.wfile.write(response.encode("utf-8"))

    def log_message(self, format, *args):
        pass


class SseServerTransport:
    def __init__(self, options=None, **kwargs):
        if options is None:
            options = kwargs
        if not options:
            options = {}
        self.port = options.get("port", 0)
        self.host = options.get("host", "127.0.0.1")
        self.path = options.get("path", "/aep/events")
        self._heartbeat_interval = options.get("heartbeatInterval", 15000)

        self._listeners = {}
        self._clients = {}
        self._next_client_id = 0
        self._server = None
        self._lock = threading.Lock()

    def on(self, event, callback):
        with self._lock:
            if event not in self._listeners:
                self._listeners[event] = []
            self._listeners[event].append(callback)

    def emit(self, event, data=None):
        with self._lock:
            callbacks = list(self._listeners.get(event, []))
        for cb in callbacks:
            try:
                cb(data)
            except Exception:
                pass

    def start(self):
        self._server = HTTPServer((self.host, self.port), _SseRequestHandler)
        self._server._aep_transport = self
        self.port = self._server.server_port
        self._server.serve_forever(poll_interval=0.1)

    def stop(self):
        if self._server:
            self._server.shutdown()
            self._server.server_close()
            self._server = None

    def send(self, data):
        if isinstance(data, str):
            data = json.loads(data)
        json_str = json.dumps(data)
        event_id = data.get("id", "")
        event_type = data.get("type", "")

        dead_clients = []
        with self._lock:
            clients = list(self._clients.items())

        for client_id, client in clients:
            try:
                wfile = client["wfile"]
                if event_id:
                    wfile.write(f"id: {event_id}\n".encode("utf-8"))
                if event_type:
                    wfile.write(f"event: {event_type}\n".encode("utf-8"))
                wfile.write(f"data: {json_str}\n\n".encode("utf-8"))
                wfile.flush()
            except Exception:
                dead_clients.append(client_id)

        for client_id in dead_clients:
            self._clients.pop(client_id, None)

    def _send_heartbeat(self, client_id):
        client = self._clients.get(client_id)
        if client is None:
            return
        try:
            client["wfile"].write(b": heartbeat\n\n")
            client["wfile"].flush()
        except Exception:
            self._clients.pop(client_id, None)
            return

        if self._heartbeat_interval > 0:
            heartbeat = threading.Timer(
                self._heartbeat_interval / 1000.0,
                self._send_heartbeat,
                args=[client_id]
            )
            heartbeat.daemon = True
            heartbeat.start()
