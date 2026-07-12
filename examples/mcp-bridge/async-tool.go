package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/axisrobo/harmovela/aep"
	"github.com/axisrobo/harmovela/aep/bridge"
)

type sink struct {
	events []map[string]any
}

func (s *sink) Send(event map[string]any) error {
	s.events = append(s.events, event)
	return nil
}

func main() {
	events := &sink{}
	b := bridge.NewMcpBridge(events)

	b.RegisterTool(bridge.AsyncToolHandler("build", "build tool", func(args map[string]any, tracker *aep.TaskTracker) map[string]any {
		return map[string]any{"artifact": "app.bin"}
	}))

	resp := b.HandleRequest(map[string]any{
		"jsonrpc": "2.0", "id": 1, "method": "tools/call",
		"params": map[string]any{"name": "build", "arguments": map[string]any{"_task_id": "task_demo"}},
	})

	content, _ := json.Marshal(resp["result"].(map[string]any)["content"])
	fmt.Println("tools/call response:", string(content))

	time.Sleep(500 * time.Millisecond)

	types := make([]string, 0, len(events.events))
	for _, e := range events.events {
		types = append(types, fmt.Sprint(e["type"]))
	}
	fmt.Println("lifecycle events:", join(types, " → "))
}

func join(ss []string, sep string) string {
	r := ""
	for i, s := range ss {
		if i > 0 {
			r += sep
		}
		r += s
	}
	return r
}
