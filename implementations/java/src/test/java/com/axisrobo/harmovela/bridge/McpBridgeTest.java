package com.axisrobo.harmovela.bridge;

import org.junit.jupiter.api.Test;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import static org.junit.jupiter.api.Assertions.*;

class McpBridgeTest {
    @Test
    @SuppressWarnings("unchecked")
    void initializeReturnsServerInfo() {
        var bridge = new McpBridge(null);
        var resp = bridge.handleRequest(Map.of("jsonrpc", "2.0", "id", 1, "method", "initialize", "params", Map.of()));
        var result = (Map<String, Object>) resp.get("result");
        var info = (Map<String, Object>) result.get("serverInfo");
        assertEquals("harmovela-mcp-bridge", info.get("name"));
        assertEquals("0.1.0", result.get("protocolVersion"));
    }

    @Test
    void notificationsInitializedReturnsNull() {
        var bridge = new McpBridge(null);
        assertNull(bridge.handleRequest(Map.of("jsonrpc", "2.0", "method", "notifications/initialized")));
    }

    @Test
    @SuppressWarnings("unchecked")
    void toolsListReturnsRegisteredTools() {
        var bridge = new McpBridge(null);
        bridge.registerTool("echo", Map.of("description", "echo tool", "required", List.of("text")),
            (args, ctx) -> Map.of("content", List.of(Map.of("type", "text", "text", args.get("text")))));
        var resp = bridge.handleRequest(Map.of("jsonrpc", "2.0", "id", 2, "method", "tools/list"));
        var result = (Map<String, Object>) resp.get("result");
        var tools = (List<Map<String, Object>>) result.get("tools");
        assertEquals(1, tools.size());
        assertEquals("echo", tools.get(0).get("name"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void toolsCallInvokesHandler() {
        var bridge = new McpBridge(null);
        bridge.registerTool("echo", Map.of("description", "echo"),
            (args, ctx) -> Map.of("content", List.of(Map.of("type", "text", "text", args.get("text")))));
        var resp = bridge.handleRequest(Map.of("jsonrpc", "2.0", "id", 3, "method", "tools/call",
            "params", Map.of("name", "echo", "arguments", Map.of("text", "hi"))));
        var result = (Map<String, Object>) resp.get("result");
        var content = (List<Map<String, Object>>) result.get("content");
        assertEquals("hi", content.get(0).get("text"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void unknownToolReturnsError() {
        var bridge = new McpBridge(null);
        var resp = bridge.handleRequest(Map.of("jsonrpc", "2.0", "id", 4, "method", "tools/call",
            "params", Map.of("name", "missing", "arguments", Map.of())));
        var error = (Map<String, Object>) resp.get("error");
        assertEquals(-32602, error.get("code"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void unknownMethodReturnsError() {
        var bridge = new McpBridge(null);
        var resp = bridge.handleRequest(Map.of("jsonrpc", "2.0", "id", 5, "method", "bogus"));
        var error = (Map<String, Object>) resp.get("error");
        assertEquals(-32601, error.get("code"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void malformedRequestReturnsError() {
        var bridge = new McpBridge(null);
        var resp = bridge.handleRequest(Map.of());
        var error = (Map<String, Object>) resp.get("error");
        assertEquals(-32600, error.get("code"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void handlerExceptionReturnsIsError() {
        var bridge = new McpBridge(null);
        bridge.registerTool("boom", Map.of(), (args, ctx) -> { throw new RuntimeException("kaboom"); });
        var resp = bridge.handleRequest(Map.of("jsonrpc", "2.0", "id", 6, "method", "tools/call",
            "params", Map.of("name", "boom", "arguments", Map.of())));
        var result = (Map<String, Object>) resp.get("result");
        assertEquals(true, result.get("isError"));
    }

    @Test
    void asyncToolHandlerEmitsLifecycle() throws Exception {
        var events = new CopyOnWriteArrayList<Map<String, Object>>();
        var bridge = new McpBridge(events::add);
        bridge.registerTool(McpBridge.asyncToolHandler("build", "build tool",
            (args, tracker) -> Map.of("artifact", "app.bin")));
        bridge.handleRequest(Map.of("jsonrpc", "2.0", "id", 1, "method", "tools/call",
            "params", Map.of("name", "build", "arguments", Map.of("_task_id", "task_x"))));
        assertTrue(waitForType(events, "task.completed"));
        var types = types(events);
        assertTrue(types.contains("task.accepted"));
        assertTrue(types.contains("task.started"));
        assertTrue(types.contains("task.progress"));
        assertTrue(types.contains("task.completed"));
    }

    @Test
    void asyncToolHandlerEmitsFailedOnError() throws Exception {
        var events = new CopyOnWriteArrayList<Map<String, Object>>();
        var bridge = new McpBridge(events::add);
        bridge.registerTool(McpBridge.asyncToolHandler("build", "build tool",
            (args, tracker) -> { throw new RuntimeException("build failed"); }));
        bridge.handleRequest(Map.of("jsonrpc", "2.0", "id", 1, "method", "tools/call",
            "params", Map.of("name", "build", "arguments", Map.of("_task_id", "task_y"))));
        assertTrue(waitForType(events, "task.failed"));
    }

    private static boolean waitForType(List<Map<String, Object>> events, String type) throws InterruptedException {
        var deadline = System.currentTimeMillis() + 2000;
        while (System.currentTimeMillis() < deadline) {
            if (types(events).contains(type)) return true;
            Thread.sleep(20);
        }
        return false;
    }

    private static List<String> types(List<Map<String, Object>> events) {
        var out = new ArrayList<String>();
        for (var e : events) out.add((String) e.get("type"));
        return out;
    }
}
