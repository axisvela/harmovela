package com.axisrobo.aep;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.BiFunction;

public class McpBridge {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @FunctionalInterface
    public interface EventSink {
        void send(Map<String, Object> event);
    }

    public interface ToolHandler {
        Map<String, Object> handle(Map<String, Object> args, Map<String, Object> ctx);
    }

    public record ToolDefinition(String name, Map<String, Object> schema, ToolHandler handler) {}

    private record Tool(Map<String, Object> schema, ToolHandler handler) {}

    private final EventSink sink;
    private final Harness harness;
    private final Map<String, Tool> tools = new LinkedHashMap<>();
    private final Map<String, Object> serverInfo = Map.of("name", "aep-mcp-bridge", "version", "0.1.0");

    public McpBridge(EventSink sink) {
        this.sink = sink;
        this.harness = new Harness();
    }

    public McpBridge registerTool(String name, Map<String, Object> schema, ToolHandler handler) {
        tools.put(name, new Tool(schema, handler));
        return this;
    }

    public McpBridge registerTool(ToolDefinition def) {
        tools.put(def.name(), new Tool(def.schema(), def.handler()));
        return this;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> handleRequest(Map<String, Object> request) {
        var method = request.get("method") instanceof String s ? s : null;
        if (method == null || method.isEmpty()) {
            return errorResponse(null, -32600, "Invalid Request");
        }
        switch (method) {
            case "initialize": return handleInitialize(request);
            case "notifications/initialized": return null;
            case "tools/list": return handleToolsList(request);
            case "tools/call": return handleToolsCall(request);
            default: return errorResponse(request.get("id"), -32601, "Method not found: " + method);
        }
    }

    private Map<String, Object> handleInitialize(Map<String, Object> request) {
        return Map.of(
            "jsonrpc", "2.0",
            "id", request.getOrDefault("id", null),
            "result", Map.of(
                "protocolVersion", "0.1.0",
                "capabilities", Map.of("tools", Map.of()),
                "serverInfo", serverInfo
            )
        );
    }

    private Map<String, Object> handleToolsList(Map<String, Object> request) {
        var toolList = new ArrayList<Map<String, Object>>();
        for (var entry : tools.entrySet()) {
            var schema = entry.getValue().schema();
            var description = schema.get("description") instanceof String s ? s : "AEP-backed tool: " + entry.getKey();
            var properties = schema.getOrDefault("properties", Map.of());
            var required = schema.getOrDefault("required", List.of());
            toolList.add(Map.of(
                "name", entry.getKey(),
                "description", description,
                "inputSchema", Map.of("type", "object", "properties", properties, "required", required)
            ));
        }
        return Map.of("jsonrpc", "2.0", "id", request.getOrDefault("id", null), "result", Map.of("tools", toolList));
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> handleToolsCall(Map<String, Object> request) {
        var params = request.get("params") instanceof Map<?, ?> p ? (Map<String, Object>) p : Map.<String, Object>of();
        var name = params.get("name") instanceof String s ? s : null;
        var tool = tools.get(name);
        if (tool == null) {
            return errorResponse(request.get("id"), -32602, "Unknown tool: " + name);
        }
        var args = params.get("arguments") instanceof Map<?, ?> a ? (Map<String, Object>) a : Map.<String, Object>of();
        var ctx = new LinkedHashMap<String, Object>();
        ctx.put("harness", harness);
        ctx.put("sink", sink);
        ctx.put("task_id", args.get("_task_id"));
        ctx.put("session_id", args.get("_session_id"));
        try {
            var result = tool.handler().handle(args, ctx);
            return Map.of("jsonrpc", "2.0", "id", request.getOrDefault("id", null), "result", result);
        } catch (Exception err) {
            return Map.of("jsonrpc", "2.0", "id", request.getOrDefault("id", null), "result", Map.of(
                "isError", true,
                "content", List.of(Map.of("type", "text", "text", String.valueOf(err.getMessage())))
            ));
        }
    }

    private Map<String, Object> errorResponse(Object id, int code, String message) {
        var resp = new LinkedHashMap<String, Object>();
        resp.put("jsonrpc", "2.0");
        resp.put("id", id);
        resp.put("error", Map.of("code", code, "message", message));
        return resp;
    }

    public static ToolDefinition asyncToolHandler(String name, String description,
                                                  BiFunction<Map<String, Object>, TaskTracker, Map<String, Object>> work) {
        ToolHandler handler = (args, ctx) -> {
            var taskId = args.get("_task_id") instanceof String s && !s.isEmpty()
                ? s : "task_" + UUID.randomUUID().toString().replace("-", "");
            var tracker = new TaskTracker(taskId, "tool:" + name);
            var sink = ctx.get("sink") instanceof EventSink es ? es : null;

            send(sink, tracker.accepted());

            var thread = new Thread(() -> {
                try {
                    send(sink, tracker.started());
                    send(sink, tracker.progress(Map.of("progress", 0.5, "message", name + " in progress")));
                    var result = work.apply(args, tracker);
                    send(sink, tracker.completed(result));
                } catch (Exception err) {
                    send(sink, tracker.failed(Errors.TOOL_ERROR, String.valueOf(err.getMessage())));
                }
            });
            thread.setDaemon(true);
            thread.start();

            String acceptedText;
            try {
                acceptedText = MAPPER.writeValueAsString(Map.of("task_id", tracker.id(), "status", "accepted"));
            } catch (Exception e) {
                acceptedText = "{\"task_id\":\"" + tracker.id() + "\",\"status\":\"accepted\"}";
            }
            return Map.of("content", List.of(Map.of("type", "text", "text", acceptedText)));
        };
        return new ToolDefinition(name, Map.of("description", description), handler);
    }

    private static void send(EventSink sink, Map<String, Object> event) {
        if (sink != null) sink.send(event);
    }
}
