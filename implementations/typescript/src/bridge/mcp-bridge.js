import { HarmovelaHarness, TaskTracker, ErrorCode, errorPayload } from "../index.js";

export class McpBridge {
  constructor(options = {}) {
    this.aep = options.aep ?? new HarmovelaHarness();
    this.transport = options.transport ?? null;
    this.tools = new Map();
    this.serverInfo = options.serverInfo ?? { name: "aep-mcp-bridge", version: "0.1.0" };
    this._initialized = false;
    this._clientCapabilities = null;
  }

  registerTool(toolDef) {
    this.tools.set(toolDef.name, { handler: toolDef.handler, schema: toolDef.schema });
    return this;
  }

  async handleRequest(request) {
    if (!request || !request.method) {
      return this._errorResponse(null, -32600, "Invalid Request");
    }

    switch (request.method) {
      case "initialize": return this._handleInitialize(request);
      case "notifications/initialized": return null;
      case "tools/list": return this._handleToolsList(request);
      case "tools/call": return this._handleToolsCall(request);
      default: return this._errorResponse(request.id, -32601, `Method not found: ${request.method}`);
    }
  }

  _handleInitialize(request) {
    this._initialized = true;
    this._clientCapabilities = request.params?.capabilities ?? {};

    return {
      jsonrpc: "2.0",
      id: request.id,
      result: {
        protocolVersion: "0.1.0",
        capabilities: {
          tools: {}
        },
        serverInfo: this.serverInfo
      }
    };
  }

  _handleToolsList(request) {
    const toolList = [];
    for (const [name, { schema }] of this.tools) {
      toolList.push({
        name,
        description: schema.description ?? `AEP-backed tool: ${name}`,
        inputSchema: {
          type: "object",
          properties: schema.properties ?? {},
          required: schema.required ?? []
        }
      });
    }

    return {
      jsonrpc: "2.0",
      id: request.id,
      result: { tools: toolList }
    };
  }

  async _handleToolsCall(request) {
    const { name, arguments: args } = request.params ?? {};

    if (!this.tools.has(name)) {
      return this._errorResponse(request.id, -32602, `Unknown tool: ${name}`);
    }

    const { handler } = this.tools.get(name);

    try {
      const result = await handler(args, {
        aep: this.aep,
        transport: this.transport,
        taskId: args?._task_id,
        sessionId: args?._session_id
      });
      return { jsonrpc: "2.0", id: request.id, result };
    } catch (err) {
      return { jsonrpc: "2.0", id: request.id, result: {
        isError: true,
        content: [{ type: "text", text: err.message }]
      }};
    }
  }

  _errorResponse(id, code, message) {
    return {
      jsonrpc: "2.0",
      id: id ?? null,
      error: { code, message }
    };
  }
}

export function asyncToolHandler(name, { description, inputSchema = {}, work }) {
  return {
    name,
    schema: {
      description,
      properties: inputSchema.properties ?? {},
      required: inputSchema.required ?? []
    },
    handler: async (args, ctx) => {
      const tracker = new TaskTracker({
        task_id: args._task_id ?? `task_${Date.now().toString(36)}`,
        source: `tool:${name}`,
        session_id: ctx.sessionId,
        description: JSON.stringify(args)
      });

      const accepted = tracker.accepted();
      ctx.transport?.send(accepted);

      // Execute in background
      setImmediate(async () => {
        try {
          const started = tracker.started();
          ctx.transport?.send(started);

          const progress = tracker.progress({ progress: 0.5, message: `${name} in progress` });
          ctx.transport?.send(progress);

          const result = await work(args, { tracker, ctx });

          const completed = tracker.completed(result);
          ctx.transport?.send(completed);
        } catch (err) {
          const failed = tracker.failed(ErrorCode.TOOL_ERROR, err.message);
          ctx.transport?.send(failed);
        }
      });

      return {
        content: [{ type: "text", text: JSON.stringify({ task_id: tracker.id, status: "accepted" }) }]
      };
    }
  };
}
