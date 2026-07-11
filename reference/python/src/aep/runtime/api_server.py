import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from ..envelope import validate_envelope


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
            return self._send(404, {"error": "not found"})

        def do_POST(self):
            route = self._route()
            if route != "/events":
                return self._send(404, {"error": "not found"})
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
