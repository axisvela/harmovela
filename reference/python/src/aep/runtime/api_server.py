import json
import queue
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from ..envelope import validate_envelope


def _parse_subscription_route(route):
    if route is None or not route.startswith("/subscriptions/"):
        return None, None
    rest = route[len("/subscriptions/"):]
    if rest.endswith("/events"):
        return rest[:-len("/events")], "/events"
    if rest.endswith("/stream"):
        return rest[:-len("/stream")], "/stream"
    if "/" in rest:
        return None, None
    return rest, None


def start_api_server(service, options):
    base = options.get("path", "/aep/api")

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def _route(self):
            path = self.path.split("?", 1)[0]
            return path[len(base):] if path.startswith(base) else None

        def _send(self, status, body):
            payload = json.dumps(body).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

        def do_GET(self):
            route = self._route()
            if route == "/healthz":
                return self._send(200, {"status": "ok", "runtime": service.config["runtime"], "delivery": service.get_stats()})
            if route == "/dlq":
                records = service.get_dead_lettered()
                return self._send(200, {"deadLettered": len(records), "records": records})
            if route == "/pending":
                records = service.get_pending()
                return self._send(200, {"pending": len(records), "records": records})
            if route == "/stats":
                return self._send(200, service.get_stats())
            if route == "/subscriptions":
                return self._send(200, {"subscriptions": service.list_subscriptions()})
            sub_id, suffix = _parse_subscription_route(route)
            if sub_id is not None:
                if suffix is None:
                    record = service.get_subscription(sub_id)
                    return self._send(200, record) if record else self._send(404, {"error": "not found"})
                if suffix == "/events":
                    if service.get_subscription(sub_id) is None:
                        return self._send(404, {"error": "not found"})
                    return self._send(200, {"events": service.take_events(sub_id, 100)})
                if suffix == "/stream":
                    return self._handle_stream(sub_id)
            return self._send(404, {"error": "not found"})

        def do_POST(self):
            route = self._route()
            if route == "/events":
                return self._handle_ingest()
            if route == "/subscriptions":
                return self._handle_create_subscription()
            return self._send(404, {"error": "not found"})

        def do_DELETE(self):
            route = self._route()
            sub_id, suffix = _parse_subscription_route(route)
            if sub_id is not None and suffix is None:
                deleted = service.delete_subscription(sub_id)
                return self._send(200, {"deleted": True}) if deleted else self._send(404, {"error": "not found"})
            return self._send(404, {"error": "not found"})

        def _handle_ingest(self):
            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length).decode() if length else ""
            try:
                event = json.loads(raw)
            except json.JSONDecodeError:
                return self._send(400, {"accepted": False, "errors": ["invalid JSON body"]})
            errors = validate_envelope(event)
            if errors:
                return self._send(400, {"accepted": False, "errors": errors})
            service.publish(event)
            return self._send(202, {"accepted": True, "id": event.get("id")})

        def _handle_create_subscription(self):
            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length).decode() if length else ""
            try:
                body = json.loads(raw) if raw else {}
            except json.JSONDecodeError:
                return self._send(400, {"error": "invalid JSON body"})
            filter_ = body.get("filter", body) if isinstance(body, dict) else {}
            record = service.create_subscription(filter_)
            return self._send(201, record)

        def _handle_stream(self, sub_id):
            if service.get_subscription(sub_id) is None:
                return self._send(404, {"error": "not found"})
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(b": ok\n\n")
            self.wfile.flush()
            for evt in service.take_events(sub_id, 1000):
                self._write_sse(evt)
            q = queue.Queue()
            detach = service.attach_stream(sub_id, lambda e: q.put(e))
            try:
                while True:
                    evt = q.get()
                    self._write_sse(evt)
            except (BrokenPipeError, ConnectionResetError, OSError):
                pass
            finally:
                if detach:
                    detach()

        def _write_sse(self, evt):
            self.wfile.write(f"data: {json.dumps(evt)}\n\n".encode())
            self.wfile.flush()

    server = ThreadingHTTPServer((options.get("host", "127.0.0.1"), options.get("port", 0)), Handler)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    class ApiHandle:
        def __init__(self):
            self.port = port

        def stop(self):
            server.shutdown()
            server.server_close()

    return ApiHandle()
