package com.axisrobo.aep.examples;

import com.axisrobo.aep.McpBridge;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * MCP bridge: register an async tool, call it, observe lifecycle events.
 * Run from implementations/java with the classpath set.
 */
public class McpBridgeDemo {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public static void main(String[] args) throws Exception {
        var events = new ArrayList<Map<String, Object>>();
        var bridge = new McpBridge((Map<String, Object> e) -> events.add(e));

        bridge.registerTool(McpBridge.asyncToolHandler("build", "build tool",
            (a, tracker) -> Map.of("artifact", "app.bin", "task_id", tracker.id())));

        var resp = bridge.handleRequest(Map.of(
            "jsonrpc", "2.0", "id", 1, "method", "tools/call",
            "params", Map.of("name", "build", "arguments", Map.of("_task_id", "task_demo"))
        ));
        @SuppressWarnings("unchecked")
        var content = (List<Map<String, Object>>) ((Map<String, Object>) resp.get("result")).get("content");
        System.out.println("tools/call response: " + MAPPER.writeValueAsString(content));

        Thread.sleep(500);

        var types = new ArrayList<String>();
        for (var e : events) types.add((String) e.get("type"));
        System.out.println("lifecycle events: " + String.join(" → ", types));
    }
}
