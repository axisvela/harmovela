#!/usr/bin/env python3
"""MCP bridge: register an async tool, call it, observe lifecycle events."""
import sys
import time
sys.path.insert(0, "implementations/python/src")

from aep.mcp_bridge import McpBridge, async_tool_handler

events = []
bridge = McpBridge(transport=type("Sink", (), {"send": lambda self, e: events.append(e)})())

bridge.register_tool(async_tool_handler("build", {
    "description": "build tool",
    "work": lambda args, ctx: {"artifact": "app.bin", "task_id": ctx.get("tracker").id}
}))

resp = bridge.handle_request({
    "jsonrpc": "2.0", "id": 1, "method": "tools/call",
    "params": {"name": "build", "arguments": {"_task_id": "task_demo"}}
})
print("tools/call response:", resp["result"]["content"])

time.sleep(0.5)
print("lifecycle events:", " → ".join(e["type"] for e in events))
