import json
import threading

from .harness import AepHarness
from .task import TaskTracker
from .errors import ErrorCode


class McpBridge:
    def __init__(self, aep=None, transport=None, server_info=None):
        self.aep = aep or AepHarness()
        self.transport = transport
        self.tools = {}
        self.server_info = server_info or {"name": "aep-mcp-bridge", "version": "0.1.0"}

    def register_tool(self, tool_def: dict):
        self.tools[tool_def["name"]] = {
            "handler": tool_def["handler"],
            "schema": tool_def.get("schema", {}),
        }
        return self

    def handle_request(self, request: dict):
        if not request or not request.get("method"):
            return self._error(None, -32600, "Invalid Request")
        method = request["method"]
        if method == "initialize":
            return self._handle_initialize(request)
        if method == "notifications/initialized":
            return None
        if method == "tools/list":
            return self._handle_tools_list(request)
        if method == "tools/call":
            return self._handle_tools_call(request)
        return self._error(request.get("id"), -32601, f"Method not found: {method}")

    def _handle_initialize(self, request):
        return {
            "jsonrpc": "2.0",
            "id": request.get("id"),
            "result": {
                "protocolVersion": "0.1.0",
                "capabilities": {"tools": {}},
                "serverInfo": self.server_info,
            },
        }

    def _handle_tools_list(self, request):
        tool_list = []
        for name, entry in self.tools.items():
            schema = entry["schema"]
            tool_list.append({
                "name": name,
                "description": schema.get("description", f"AEP-backed tool: {name}"),
                "inputSchema": {
                    "type": "object",
                    "properties": schema.get("properties", {}),
                    "required": schema.get("required", []),
                },
            })
        return {"jsonrpc": "2.0", "id": request.get("id"), "result": {"tools": tool_list}}

    def _handle_tools_call(self, request):
        params = request.get("params") or {}
        name = params.get("name")
        args = params.get("arguments") or {}
        if name not in self.tools:
            return self._error(request.get("id"), -32602, f"Unknown tool: {name}")
        handler = self.tools[name]["handler"]
        try:
            result = handler(args, {
                "aep": self.aep,
                "transport": self.transport,
                "task_id": args.get("_task_id"),
                "session_id": args.get("_session_id"),
            })
            return {"jsonrpc": "2.0", "id": request.get("id"), "result": result}
        except Exception as err:
            return {"jsonrpc": "2.0", "id": request.get("id"), "result": {
                "isError": True,
                "content": [{"type": "text", "text": str(err)}],
            }}

    def _error(self, request_id, code, message):
        return {"jsonrpc": "2.0", "id": request_id, "error": {"code": code, "message": message}}


def async_tool_handler(name: str, options: dict):
    description = options.get("description")
    input_schema = options.get("input_schema", {})
    work = options["work"]

    def handler(args, ctx):
        tracker = TaskTracker(
            task_id=args.get("_task_id") or None,
            source=f"tool:{name}",
            session_id=ctx.get("session_id"),
            description=json.dumps(args),
        )
        transport = ctx.get("transport")

        def _send(event):
            if transport is not None:
                transport.send(event)

        _send(tracker.accepted())

        def _run():
            try:
                _send(tracker.started())
                _send(tracker.progress({"progress": 0.5, "message": f"{name} in progress"}))
                result = work(args, {"tracker": tracker, "ctx": ctx})
                _send(tracker.completed(result))
            except Exception as err:
                _send(tracker.failed(ErrorCode.TOOL_ERROR, str(err)))

        threading.Thread(target=_run, daemon=True).start()

        return {"content": [{"type": "text", "text": json.dumps({"task_id": tracker.id, "status": "accepted"})}]}

    return {
        "name": name,
        "schema": {
            "description": description,
            "properties": input_schema.get("properties", {}),
            "required": input_schema.get("required", []),
        },
        "handler": handler,
    }
