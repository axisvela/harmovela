package bridge

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/axisrobo/harmovela/aep"
	"github.com/axisrobo/harmovela/task"
)

// Sender receives AEP events emitted by tool handlers.
type Sender interface {
	Send(event map[string]any) error
}

// McpContext is passed to tool handlers.
type McpContext struct {
	Harness   *aep.Harness
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
	harness    *aep.Harness
	sender     Sender
	tools      map[string]McpTool
	serverInfo map[string]any
}

func NewMcpBridge(sender Sender) *McpBridge {
	return &McpBridge{
		harness:    aep.NewHarness(),
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
func AsyncToolHandler(name, description string, work func(args map[string]any, tracker *task.Tracker) map[string]any) McpTool {
	return McpTool{
		Name:   name,
		Schema: map[string]any{"description": description},
		Handler: func(args map[string]any, ctx McpContext) map[string]any {
			taskID, _ := args["_task_id"].(string)
			if taskID == "" {
				taskID = fmt.Sprintf("task_%d", time.Now().UnixMilli())
			}
			tracker := task.NewTracker(taskID, "tool:"+name, jsonString(args))
			send := func(event map[string]any) {
				if ctx.Sender != nil {
					ctx.Sender.Send(event)
				}
			}
			send(tracker.Accepted())

			go func() {
				defer func() {
					if r := recover(); r != nil {
						send(tracker.Failed(aep.ErrorCodeToolError, fmt.Sprintf("%v", r)))
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
