# Java MCP Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the TypeScript MCP bridge to Java: promote `TaskTracker` to a standalone public class with a full lifecycle API, then add an `McpBridge` JSON-RPC handler and an async tool handler emitting AEP task lifecycle events.

**Architecture:** Move `TaskTracker` and its state machine out of `Harness` into a public `com.axisrobo.aep.TaskTracker` with a public `TaskState` enum, `id()` accessor, and public `accepted/started/progress/completed/failed` methods returning event maps. `Harness` uses the standalone class with identical behavior. A new `com.axisrobo.aep.McpBridge` provides JSON-RPC dispatch and an async tool handler that emits lifecycle events to a functional `EventSink`.

**Tech Stack:** Java 21, Jackson, JUnit Jupiter.

**Design reference:** `docs/superpowers/specs/2026-07-11-multi-language-mcp-bridge-design.md`

---

## File Structure

- Create `reference/java/src/main/java/com/axisrobo/aep/TaskTracker.java`: standalone public class + `TaskState` enum + lifecycle methods.
- Modify `reference/java/src/main/java/com/axisrobo/aep/Harness.java`: remove inner `TaskTracker`/`TaskState`/state maps; use the standalone class.
- Create `reference/java/src/main/java/com/axisrobo/aep/McpBridge.java`: bridge + `EventSink` + async tool handler.
- Create tests: `TaskTrackerTest.java`, `McpBridgeTest.java`.

---

## Task 1: Promote TaskTracker to a standalone public class

**Files:**
- Create: `reference/java/src/main/java/com/axisrobo/aep/TaskTracker.java`
- Modify: `reference/java/src/main/java/com/axisrobo/aep/Harness.java`
- Test: `reference/java/src/test/java/com/axisrobo/aep/TaskTrackerTest.java`

- [ ] **Step 1: Write failing test**

Create `reference/java/src/test/java/com/axisrobo/aep/TaskTrackerTest.java`:

```java
package com.axisrobo.aep;

import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class TaskTrackerTest {
    @Test
    void lifecycleMethodsReturnEvents() {
        var tk = new TaskTracker("task_1", "tool:build");
        assertEquals("task_1", tk.id());

        var accepted = tk.accepted();
        assertEquals("task.accepted", accepted.get("type"));
        assertEquals("task_1", accepted.get("task_id"));

        var started = tk.started();
        assertEquals("task.started", started.get("type"));

        var progress = tk.progress(Map.of("progress", 0.5));
        assertEquals("task.progress", progress.get("type"));
        @SuppressWarnings("unchecked")
        var payload = (Map<String, Object>) progress.get("payload");
        assertEquals(0.5, payload.get("progress"));

        var completed = tk.completed(Map.of("artifact", "app.bin"));
        assertEquals("task.completed", completed.get("type"));
    }

    @Test
    void failedIncludesErrorPayload() {
        var tk = new TaskTracker("task_2", "tool:build");
        tk.accepted();
        tk.started();
        var failed = tk.failed(Errors.TOOL_ERROR, "boom");
        assertEquals("task.failed", failed.get("type"));
        @SuppressWarnings("unchecked")
        var payload = (Map<String, Object>) failed.get("payload");
        @SuppressWarnings("unchecked")
        var error = (Map<String, Object>) payload.get("error");
        assertEquals(Errors.TOOL_ERROR, error.get("code"));
    }

    @Test
    void illegalTransitionReturnsNull() {
        var tk = new TaskTracker("task_3", "tool:build");
        // completed is not allowed directly from submitted
        assertNull(tk.transition("task.completed", null));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd reference/java && mvn test -Dtest=TaskTrackerTest`
Expected: compilation failure — `TaskTracker` is not a public top-level type; `id()`, `accepted()`, etc. do not exist.

- [ ] **Step 3: Create the standalone TaskTracker**

Create `reference/java/src/main/java/com/axisrobo/aep/TaskTracker.java`:

```java
package com.axisrobo.aep;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

public class TaskTracker {
    public enum TaskState { SUBMITTED, ACCEPTED, STARTED, PROGRESS, BLOCKED, OUTPUT, COMPLETED, FAILED, CANCELLED, TIMED_OUT }

    private static final Map<String, TaskState> EVENT_TO_STATE = Map.ofEntries(
        Map.entry("task.submitted", TaskState.SUBMITTED), Map.entry("task.accepted", TaskState.ACCEPTED),
        Map.entry("task.started", TaskState.STARTED), Map.entry("task.progress", TaskState.PROGRESS),
        Map.entry("task.blocked", TaskState.BLOCKED), Map.entry("task.output", TaskState.OUTPUT),
        Map.entry("task.completed", TaskState.COMPLETED), Map.entry("task.failed", TaskState.FAILED),
        Map.entry("task.cancelled", TaskState.CANCELLED), Map.entry("task.timed_out", TaskState.TIMED_OUT)
    );

    private static final Set<TaskState> TERMINAL = Set.of(TaskState.COMPLETED, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT);

    private static final Map<TaskState, Set<TaskState>> TRANSITIONS = Map.of(
        TaskState.SUBMITTED, Set.of(TaskState.ACCEPTED, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT),
        TaskState.ACCEPTED, Set.of(TaskState.STARTED, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT),
        TaskState.STARTED, Set.of(TaskState.PROGRESS, TaskState.OUTPUT, TaskState.BLOCKED, TaskState.COMPLETED, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT),
        TaskState.BLOCKED, Set.of(TaskState.STARTED, TaskState.PROGRESS, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT),
        TaskState.PROGRESS, Set.of(TaskState.PROGRESS, TaskState.OUTPUT, TaskState.BLOCKED, TaskState.COMPLETED, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT),
        TaskState.OUTPUT, Set.of(TaskState.PROGRESS, TaskState.OUTPUT, TaskState.BLOCKED, TaskState.COMPLETED, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT)
    );

    private final String id;
    private final String source;
    private TaskState state = TaskState.SUBMITTED;
    private int eventId;

    public TaskTracker(String id, String source) {
        this.id = id;
        this.source = source;
    }

    public String id() { return id; }
    public TaskState getState() { return state; }
    public boolean isTerminal() { return TERMINAL.contains(state); }

    public void accept() { transition("task.accepted", null); }

    public Map<String, Object> accepted() { return transition("task.accepted", null); }
    public Map<String, Object> started() { return transition("task.started", null); }
    public Map<String, Object> progress(Map<String, Object> payload) { return transition("task.progress", payload); }
    public Map<String, Object> completed(Map<String, Object> result) { return transition("task.completed", result); }
    public Map<String, Object> failed(String code, String message) {
        return transition("task.failed", Map.of("error", Errors.errorPayload(code, message, false)));
    }

    public Map<String, Object> transition(String eventType, Map<String, Object> payload) {
        var nextState = EVENT_TO_STATE.get(eventType);
        if (nextState == null) return null;

        if (nextState != state) {
            var allowed = TRANSITIONS.get(state);
            if (allowed == null || !allowed.contains(nextState)) return null;
        }
        state = nextState;

        var result = new HashMap<String, Object>();
        if (payload != null) result.putAll(payload);
        result.put("task_id", id);
        result.put("state", state.name().toLowerCase());

        if (TERMINAL.contains(state) && !result.containsKey("result")) {
            result.put("result", state.name().toLowerCase());
        }

        eventId++;
        return Map.<String, Object>of(
            "aep_version", "0.1",
            "id", "evt_task_" + String.format("%06d", eventId),
            "type", eventType,
            "source", source,
            "task_id", id,
            "created_at", Instant.now().toString(),
            "payload", result
        );
    }
}
```

- [ ] **Step 4: Update Harness to use the standalone class**

In `reference/java/src/main/java/com/axisrobo/aep/Harness.java`:

Remove the inner `enum TaskState`, the static `EVENT_TO_STATE`, `TERMINAL`, `TRANSITIONS` maps, and the inner `static class TaskTracker` (lines 8–75). Keep everything else.

Update field and method types that referenced the inner types:
- `private final Map<String, TaskTracker> tasks` now refers to the top-level `TaskTracker` (same simple name, same package — no import needed).
- `public Map<String, TaskTracker> getTasks()` stays valid.
- `handleTaskSubmitted` uses `new TaskTracker(taskId, source)` and `tracker.accept()` — unchanged calls, now resolving to the standalone class.
- `handleTaskEvent` calls `tracker.transition(...)`, `tracker.getState()`, `tracker.isTerminal()` — all still public on the standalone class.

No other Harness logic changes.

- [ ] **Step 5: Run TaskTracker test and Harness tests**

Run: `cd reference/java && mvn test -Dtest=TaskTrackerTest,HarnessTest,ConformanceTest`
Expected: all pass.

- [ ] **Step 6: Commit and push**

```bash
git add reference/java/src/main/java/com/axisrobo/aep/TaskTracker.java reference/java/src/main/java/com/axisrobo/aep/Harness.java reference/java/src/test/java/com/axisrobo/aep/TaskTrackerTest.java
git commit -m "feat(java): promote TaskTracker to standalone public class with lifecycle API"
git push origin master
```

---

## Task 2: McpBridge and async tool handler

**Files:**
- Create: `reference/java/src/main/java/com/axisrobo/aep/McpBridge.java`
- Test: `reference/java/src/test/java/com/axisrobo/aep/McpBridgeTest.java`

- [ ] **Step 1: Write failing tests**

Create `reference/java/src/test/java/com/axisrobo/aep/McpBridgeTest.java`:

```java
package com.axisrobo.aep;

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
        assertEquals("aep-mcp-bridge", info.get("name"));
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd reference/java && mvn test -Dtest=McpBridgeTest`
Expected: compilation failure — `McpBridge` not found.

- [ ] **Step 3: Implement McpBridge**

Create `reference/java/src/main/java/com/axisrobo/aep/McpBridge.java`:

```java
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

    public record ToolDefinition(String name, Map<String, Object> schema, ToolHandler handler) {}

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
```

- [ ] **Step 4: Run bridge tests**

Run: `cd reference/java && mvn test -Dtest=McpBridgeTest`
Expected: all pass.

- [ ] **Step 5: Commit and push**

```bash
git add reference/java/src/main/java/com/axisrobo/aep/McpBridge.java reference/java/src/test/java/com/axisrobo/aep/McpBridgeTest.java
git commit -m "feat(java): add MCP bridge with JSON-RPC handler and async tool handler"
git push origin master
```

---

## Task 3: Final verification

- [ ] **Step 1: Run full Java suite**

Run: `cd reference/java && mvn test`
Expected: BUILD SUCCESS, all tests pass.

- [ ] **Step 2: Verify git sync**

Run: `git status -sb`
Expected: `## master...origin/master` with no changed files.
