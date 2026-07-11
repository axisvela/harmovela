# Go MCP Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the TypeScript MCP bridge to Go: upgrade `TaskTracker` with exported lifecycle methods, then add an `McpBridge` JSON-RPC handler and an async tool handler emitting AEP task lifecycle events.

**Architecture:** `TaskTracker` in `aep/harness.go` gains exported `Accepted/Started/Progress/Completed/Failed` methods that delegate to the existing private `transition`. A new `aep/mcp_bridge.go` provides `McpBridge` (tool registry + JSON-RPC dispatch over `map[string]any`) and `AsyncToolHandler` (creates a tracker, emits `task.accepted`, returns MCP content, then emits `task.started/progress/completed/failed` from a goroutine to a `Sender` sink).

**Tech Stack:** Go 1.25, stdlib, `go test`.

**Design reference:** `docs/superpowers/specs/2026-07-11-multi-language-mcp-bridge-design.md`

---

## File Structure

- Modify `reference/go/aep/harness.go`: add exported `TaskTracker` lifecycle methods.
- Create `reference/go/aep/mcp_bridge.go`: `McpBridge`, `Sender`, tool types, `AsyncToolHandler`.
- Create `reference/go/aep/mcp_bridge_test.go`.
- Modify `reference/go/aep/harness_test.go` or add cases for the new methods (a dedicated test file is fine).

---

## Task 1: Upgrade TaskTracker with exported lifecycle methods

**Files:**
- Modify: `reference/go/aep/harness.go`
- Test: `reference/go/aep/task_lifecycle_test.go`

- [ ] **Step 1: Write failing test**

Create `reference/go/aep/task_lifecycle_test.go`:

```go
package aep

import "testing"

func TestTaskTrackerLifecycleMethods(t *testing.T) {
	tk := NewTaskTracker("task_1", "tool:build", "build app")

	accepted := tk.Accepted()
	if accepted["type"] != "task.accepted" {
		t.Fatalf("expected task.accepted, got %v", accepted["type"])
	}
	if accepted["task_id"] != "task_1" {
		t.Fatalf("expected task_1, got %v", accepted["task_id"])
	}

	started := tk.Started()
	if started["type"] != "task.started" {
		t.Fatalf("expected task.started, got %v", started["type"])
	}

	progress := tk.Progress(map[string]any{"progress": 0.5})
	if progress["type"] != "task.progress" {
		t.Fatalf("expected task.progress, got %v", progress["type"])
	}
	payload := progress["payload"].(map[string]any)
	if payload["progress"] != 0.5 {
		t.Fatalf("expected progress 0.5, got %v", payload["progress"])
	}

	completed := tk.Completed(map[string]any{"artifact": "app.bin"})
	if completed["type"] != "task.completed" {
		t.Fatalf("expected task.completed, got %v", completed["type"])
	}
}

func TestTaskTrackerFailed(t *testing.T) {
	tk := NewTaskTracker("task_2", "tool:build", "build app")
	tk.Accepted()
	tk.Started()
	failed := tk.Failed(ErrorCodeToolError, "boom")
	if failed["type"] != "task.failed" {
		t.Fatalf("expected task.failed, got %v", failed["type"])
	}
	payload := failed["payload"].(map[string]any)
	errObj := payload["error"].(map[string]any)
	if errObj["code"] != ErrorCodeToolError {
		t.Fatalf("expected tool_error, got %v", errObj["code"])
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd reference/go && go test ./aep/ -run TestTaskTracker`
Expected: build failure, `Accepted`/`Started`/`Progress`/`Completed`/`Failed` undefined.

- [ ] **Step 3: Add exported lifecycle methods**

In `reference/go/aep/harness.go`, after the existing `Accept()` method (which returns `tk.transition("task.accepted", nil)`), add:

```go
func (tk *TaskTracker) Accepted() map[string]any {
	return tk.transition("task.accepted", nil)
}

func (tk *TaskTracker) Started() map[string]any {
	return tk.transition("task.started", nil)
}

func (tk *TaskTracker) Progress(payload map[string]any) map[string]any {
	return tk.transition("task.progress", payload)
}

func (tk *TaskTracker) Completed(result map[string]any) map[string]any {
	return tk.transition("task.completed", result)
}

func (tk *TaskTracker) Failed(code, message string) map[string]any {
	return tk.transition("task.failed", map[string]any{
		"error": ErrorPayload(code, message, false),
	})
}
```

Note: `Accept()` already returns the accepted event; `Accepted()` is an alias with the TypeScript-aligned name. Keep both so existing harness behavior is unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd reference/go && go test ./aep/ -run TestTaskTracker`
Expected: PASS.

- [ ] **Step 5: Run harness tests to confirm no regression**

Run: `cd reference/go && go test ./aep/ -run "Harness|Conformance"`
Expected: PASS.

- [ ] **Step 6: Commit and push**

```bash
git add reference/go/aep/harness.go reference/go/aep/task_lifecycle_test.go
git commit -m "feat(go): add exported TaskTracker lifecycle methods"
git push origin master
```

---

## Task 2: McpBridge and async tool handler

**Files:**
- Create: `reference/go/aep/mcp_bridge.go`
- Test: `reference/go/aep/mcp_bridge_test.go`

- [ ] **Step 1: Write failing tests**

Create `reference/go/aep/mcp_bridge_test.go`:

```go
package aep

import (
	"sync"
	"testing"
	"time"
)

func TestMcpInitialize(t *testing.T) {
	bridge := NewMcpBridge(nil)
	resp := bridge.HandleRequest(map[string]any{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": map[string]any{}})
	result := resp["result"].(map[string]any)
	info := result["serverInfo"].(map[string]any)
	if info["name"] != "aep-mcp-bridge" {
		t.Fatalf("expected aep-mcp-bridge, got %v", info["name"])
	}
	if result["protocolVersion"] != "0.1.0" {
		t.Fatalf("expected 0.1.0, got %v", result["protocolVersion"])
	}
}

func TestMcpNotificationsInitialized(t *testing.T) {
	bridge := NewMcpBridge(nil)
	resp := bridge.HandleRequest(map[string]any{"jsonrpc": "2.0", "method": "notifications/initialized"})
	if resp != nil {
		t.Fatalf("expected nil, got %v", resp)
	}
}

func TestMcpToolsList(t *testing.T) {
	bridge := NewMcpBridge(nil)
	bridge.RegisterTool(McpTool{
		Name:   "echo",
		Schema: map[string]any{"description": "echo tool", "required": []any{"text"}},
		Handler: func(args map[string]any, ctx McpContext) map[string]any {
			return map[string]any{"content": []any{map[string]any{"type": "text", "text": args["text"]}}}
		},
	})
	resp := bridge.HandleRequest(map[string]any{"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
	result := resp["result"].(map[string]any)
	tools := result["tools"].([]map[string]any)
	if len(tools) != 1 || tools[0]["name"] != "echo" {
		t.Fatalf("expected echo tool, got %v", tools)
	}
}

func TestMcpToolsCall(t *testing.T) {
	bridge := NewMcpBridge(nil)
	bridge.RegisterTool(McpTool{
		Name:   "echo",
		Schema: map[string]any{"description": "echo"},
		Handler: func(args map[string]any, ctx McpContext) map[string]any {
			return map[string]any{"content": []any{map[string]any{"type": "text", "text": args["text"]}}}
		},
	})
	resp := bridge.HandleRequest(map[string]any{"jsonrpc": "2.0", "id": 3, "method": "tools/call",
		"params": map[string]any{"name": "echo", "arguments": map[string]any{"text": "hi"}}})
	result := resp["result"].(map[string]any)
	content := result["content"].([]any)[0].(map[string]any)
	if content["text"] != "hi" {
		t.Fatalf("expected hi, got %v", content["text"])
	}
}

func TestMcpUnknownTool(t *testing.T) {
	bridge := NewMcpBridge(nil)
	resp := bridge.HandleRequest(map[string]any{"jsonrpc": "2.0", "id": 4, "method": "tools/call",
		"params": map[string]any{"name": "missing", "arguments": map[string]any{}}})
	errObj := resp["error"].(map[string]any)
	if errObj["code"] != -32602 {
		t.Fatalf("expected -32602, got %v", errObj["code"])
	}
}

func TestMcpUnknownMethod(t *testing.T) {
	bridge := NewMcpBridge(nil)
	resp := bridge.HandleRequest(map[string]any{"jsonrpc": "2.0", "id": 5, "method": "bogus"})
	errObj := resp["error"].(map[string]any)
	if errObj["code"] != -32601 {
		t.Fatalf("expected -32601, got %v", errObj["code"])
	}
}

func TestMcpMalformedRequest(t *testing.T) {
	bridge := NewMcpBridge(nil)
	resp := bridge.HandleRequest(map[string]any{})
	errObj := resp["error"].(map[string]any)
	if errObj["code"] != -32600 {
		t.Fatalf("expected -32600, got %v", errObj["code"])
	}
}

type collectSink struct {
	mu     sync.Mutex
	events []map[string]any
}

func newCollectSink() *collectSink {
	return &collectSink{}
}

func (s *collectSink) Send(event map[string]any) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.events = append(s.events, event)
	return nil
}

func (s *collectSink) types() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]string, 0, len(s.events))
	for _, e := range s.events {
		out = append(out, e["type"].(string))
	}
	return out
}

func TestMcpAsyncToolHandlerLifecycle(t *testing.T) {
	sink := newCollectSink()
	bridge := NewMcpBridge(sink)
	bridge.RegisterTool(AsyncToolHandler("build", "build tool", func(args map[string]any, tracker *TaskTracker) map[string]any {
		return map[string]any{"artifact": "app.bin"}
	}))
	resp := bridge.HandleRequest(map[string]any{"jsonrpc": "2.0", "id": 1, "method": "tools/call",
		"params": map[string]any{"name": "build", "arguments": map[string]any{"_task_id": "task_x"}}})
	if resp["result"] == nil {
		t.Fatal("expected result")
	}
	if !waitForType(sink, "task.completed", 2*time.Second) {
		t.Fatalf("timed out; got %v", sink.types())
	}
	types := sink.types()
	for _, want := range []string{"task.accepted", "task.started", "task.progress", "task.completed"} {
		if !containsStr(types, want) {
			t.Fatalf("missing %s in %v", want, types)
		}
	}
}

func TestMcpAsyncToolHandlerFailure(t *testing.T) {
	sink := newCollectSink()
	bridge := NewMcpBridge(sink)
	bridge.RegisterTool(AsyncToolHandler("build", "build tool", func(args map[string]any, tracker *TaskTracker) map[string]any {
		panic("build failed")
	}))
	bridge.HandleRequest(map[string]any{"jsonrpc": "2.0", "id": 1, "method": "tools/call",
		"params": map[string]any{"name": "build", "arguments": map[string]any{"_task_id": "task_y"}}})
	if !waitForType(sink, "task.failed", 2*time.Second) {
		t.Fatalf("timed out; got %v", sink.types())
	}
}

func waitForType(sink *collectSink, typ string, timeout time.Duration) bool {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if containsStr(sink.types(), typ) {
			return true
		}
		time.Sleep(20 * time.Millisecond)
	}
	return false
}

func containsStr(list []string, s string) bool {
	for _, v := range list {
		if v == s {
			return true
		}
	}
	return false
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd reference/go && go test ./aep/ -run TestMcp`
Expected: build failure, `NewMcpBridge`/`McpTool`/`McpContext`/`AsyncToolHandler` undefined.

- [ ] **Step 3: Implement the bridge**

Create `reference/go/aep/mcp_bridge.go`:

```go
package aep

import (
	"encoding/json"
	"fmt"
	"time"
)

// Sender receives AEP events emitted by tool handlers.
type Sender interface {
	Send(event map[string]any) error
}

// McpContext is passed to tool handlers.
type McpContext struct {
	Harness   *Harness
	Sender    Sender
	TaskID    string
	SessionID string
}

// McpTool is a registered MCP tool.
type McpTool struct {
	Name    string
	Schema  map[string]any
	Handler func(args map[string]any, ctx McpContext) map[string]any
}

// McpBridge dispatches JSON-RPC MCP requests to registered AEP-backed tools.
type McpBridge struct {
	harness    *Harness
	sender     Sender
	tools      map[string]McpTool
	serverInfo map[string]any
}

func NewMcpBridge(sender Sender) *McpBridge {
	return &McpBridge{
		harness:    NewHarness(),
		sender:     sender,
		tools:      make(map[string]McpTool),
		serverInfo: map[string]any{"name": "aep-mcp-bridge", "version": "0.1.0"},
	}
}

func (b *McpBridge) RegisterTool(tool McpTool) *McpBridge {
	b.tools[tool.Name] = tool
	return b
}

func (b *McpBridge) HandleRequest(request map[string]any) map[string]any {
	method, _ := request["method"].(string)
	if method == "" {
		return b.errorResponse(nil, -32600, "Invalid Request")
	}
	switch method {
	case "initialize":
		return b.handleInitialize(request)
	case "notifications/initialized":
		return nil
	case "tools/list":
		return b.handleToolsList(request)
	case "tools/call":
		return b.handleToolsCall(request)
	default:
		return b.errorResponse(request["id"], -32601, "Method not found: "+method)
	}
}

func (b *McpBridge) handleInitialize(request map[string]any) map[string]any {
	return map[string]any{
		"jsonrpc": "2.0",
		"id":      request["id"],
		"result": map[string]any{
			"protocolVersion": "0.1.0",
			"capabilities":    map[string]any{"tools": map[string]any{}},
			"serverInfo":      b.serverInfo,
		},
	}
}

func (b *McpBridge) handleToolsList(request map[string]any) map[string]any {
	tools := make([]map[string]any, 0, len(b.tools))
	for name, tool := range b.tools {
		description, _ := tool.Schema["description"].(string)
		if description == "" {
			description = "AEP-backed tool: " + name
		}
		properties, ok := tool.Schema["properties"]
		if !ok {
			properties = map[string]any{}
		}
		required, ok := tool.Schema["required"]
		if !ok {
			required = []any{}
		}
		tools = append(tools, map[string]any{
			"name":        name,
			"description": description,
			"inputSchema": map[string]any{
				"type":       "object",
				"properties": properties,
				"required":   required,
			},
		})
	}
	return map[string]any{"jsonrpc": "2.0", "id": request["id"], "result": map[string]any{"tools": tools}}
}

func (b *McpBridge) handleToolsCall(request map[string]any) map[string]any {
	params, _ := request["params"].(map[string]any)
	if params == nil {
		params = map[string]any{}
	}
	name, _ := params["name"].(string)
	tool, ok := b.tools[name]
	if !ok {
		return b.errorResponse(request["id"], -32602, "Unknown tool: "+name)
	}
	args, _ := params["arguments"].(map[string]any)
	if args == nil {
		args = map[string]any{}
	}
	sessionID, _ := args["_session_id"].(string)
	taskID, _ := args["_task_id"].(string)
	result := invokeTool(tool, args, McpContext{
		Harness:   b.harness,
		Sender:    b.sender,
		TaskID:    taskID,
		SessionID: sessionID,
	})
	return map[string]any{"jsonrpc": "2.0", "id": request["id"], "result": result}
}

func invokeTool(tool McpTool, args map[string]any, ctx McpContext) (result map[string]any) {
	defer func() {
		if r := recover(); r != nil {
			result = map[string]any{
				"isError": true,
				"content": []any{map[string]any{"type": "text", "text": fmt.Sprintf("%v", r)}},
			}
		}
	}()
	return tool.Handler(args, ctx)
}

func (b *McpBridge) errorResponse(id any, code int, message string) map[string]any {
	return map[string]any{
		"jsonrpc": "2.0",
		"id":      id,
		"error":   map[string]any{"code": code, "message": message},
	}
}

// AsyncToolHandler builds a tool whose handler emits AEP task lifecycle events.
func AsyncToolHandler(name, description string, work func(args map[string]any, tracker *TaskTracker) map[string]any) McpTool {
	return McpTool{
		Name:   name,
		Schema: map[string]any{"description": description},
		Handler: func(args map[string]any, ctx McpContext) map[string]any {
			taskID, _ := args["_task_id"].(string)
			if taskID == "" {
				taskID = fmt.Sprintf("task_%d", time.Now().UnixMilli())
			}
			tracker := NewTaskTracker(taskID, "tool:"+name, jsonString(args))
			send := func(event map[string]any) {
				if ctx.Sender != nil {
					ctx.Sender.Send(event)
				}
			}
			send(tracker.Accepted())

			go func() {
				defer func() {
					if r := recover(); r != nil {
						send(tracker.Failed(ErrorCodeToolError, fmt.Sprintf("%v", r)))
					}
				}()
				send(tracker.Started())
				send(tracker.Progress(map[string]any{"progress": 0.5, "message": name + " in progress"}))
				result := work(args, tracker)
				send(tracker.Completed(result))
			}()

			acceptedText := jsonString(map[string]any{"task_id": tracker.ID, "status": "accepted"})
			return map[string]any{"content": []any{map[string]any{"type": "text", "text": acceptedText}}}
		},
	}
}

func jsonString(v any) string {
	data, err := json.Marshal(v)
	if err != nil {
		return "{}"
	}
	return string(data)
}
```

The file uses `time.Now().UnixMilli()` for a fallback task id and `encoding/json` for content serialization; both are in the import block above.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd reference/go && go test ./aep/ -run TestMcp`
Expected: PASS.

- [ ] **Step 5: Run the full aep package**

Run: `cd reference/go && go test ./aep/`
Expected: PASS.

- [ ] **Step 6: Commit and push**

```bash
git add reference/go/aep/mcp_bridge.go reference/go/aep/mcp_bridge_test.go
git commit -m "feat(go): add MCP bridge with JSON-RPC handler and async tool handler"
git push origin master
```

---

## Task 3: Final verification

- [ ] **Step 1: Run full Go suite**

Run: `cd reference/go && go test ./...`
Expected: all packages pass.

- [ ] **Step 2: Build all binaries**

Run: `cd reference/go && go build ./...`
Expected: no errors.

- [ ] **Step 3: Verify git sync**

Run: `git status -sb`
Expected: `## master...origin/master` with no changed files.
