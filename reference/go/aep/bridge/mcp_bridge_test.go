package bridge

import (
	"sync"
	"testing"
	"time"

	"github.com/axisrobo/aep/aep"
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
	bridge.RegisterTool(AsyncToolHandler("build", "build tool", func(args map[string]any, tracker *aep.TaskTracker) map[string]any {
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
	bridge.RegisterTool(AsyncToolHandler("build", "build tool", func(args map[string]any, tracker *aep.TaskTracker) map[string]any {
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
