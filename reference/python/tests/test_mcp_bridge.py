from aep.mcp_bridge import McpBridge


def test_initialize_returns_server_info():
    bridge = McpBridge()
    resp = bridge.handle_request({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}})
    assert resp["result"]["serverInfo"]["name"] == "aep-mcp-bridge"
    assert resp["result"]["capabilities"] == {"tools": {}}
    assert resp["result"]["protocolVersion"] == "0.1.0"


def test_notifications_initialized_returns_none():
    bridge = McpBridge()
    assert bridge.handle_request({"jsonrpc": "2.0", "method": "notifications/initialized"}) is None


def test_tools_list_returns_registered_tools():
    bridge = McpBridge()
    bridge.register_tool({
        "name": "echo",
        "schema": {"description": "echo tool", "properties": {"text": {"type": "string"}}, "required": ["text"]},
        "handler": lambda args, ctx: {"content": [{"type": "text", "text": args["text"]}]},
    })
    resp = bridge.handle_request({"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
    tools = resp["result"]["tools"]
    assert len(tools) == 1
    assert tools[0]["name"] == "echo"
    assert tools[0]["inputSchema"]["required"] == ["text"]


def test_tools_call_invokes_handler():
    bridge = McpBridge()
    bridge.register_tool({
        "name": "echo",
        "schema": {"description": "echo tool"},
        "handler": lambda args, ctx: {"content": [{"type": "text", "text": args["text"]}]},
    })
    resp = bridge.handle_request({"jsonrpc": "2.0", "id": 3, "method": "tools/call",
                                  "params": {"name": "echo", "arguments": {"text": "hi"}}})
    assert resp["result"]["content"][0]["text"] == "hi"


def test_unknown_tool_returns_error():
    bridge = McpBridge()
    resp = bridge.handle_request({"jsonrpc": "2.0", "id": 4, "method": "tools/call",
                                  "params": {"name": "missing", "arguments": {}}})
    assert resp["error"]["code"] == -32602


def test_unknown_method_returns_error():
    bridge = McpBridge()
    resp = bridge.handle_request({"jsonrpc": "2.0", "id": 5, "method": "bogus"})
    assert resp["error"]["code"] == -32601


def test_malformed_request_returns_error():
    bridge = McpBridge()
    resp = bridge.handle_request({})
    assert resp["error"]["code"] == -32600


def test_handler_exception_returns_is_error():
    bridge = McpBridge()
    def boom(args, ctx):
        raise ValueError("kaboom")
    bridge.register_tool({"name": "boom", "schema": {}, "handler": boom})
    resp = bridge.handle_request({"jsonrpc": "2.0", "id": 6, "method": "tools/call",
                                  "params": {"name": "boom", "arguments": {}}})
    assert resp["result"]["isError"] is True
    assert "kaboom" in resp["result"]["content"][0]["text"]
