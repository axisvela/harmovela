import { McpBridge, asyncToolHandler } from "./mcp-bridge.js";
import { MockStdioTransport } from "../transport/stdio.js";

const TERMINAL_TASK_EVENTS = new Set(["task.completed", "task.failed", "task.cancelled", "task.timed_out"]);

export function createDemoBridge(options = {}) {
  const delayMs = options.delayMs ?? 50;
  const transport = options.transport ?? new MockStdioTransport();
  const bridge = new McpBridge({ transport });

  bridge.registerTool(asyncToolHandler("web_crawl", {
    description: "Crawl a URL and index its content. Returns immediately with a task_id; progress and results are delivered as AEP events.",
    inputSchema: {
      properties: {
        url: { type: "string", description: "URL to crawl" },
        depth: { type: "number", description: "Crawl depth" }
      },
      required: ["url"]
    },
    work: async (args) => {
      await sleep(delayMs);
      return { pages_indexed: 42, url: args.url, depth: args.depth ?? 1 };
    }
  }));

  bridge.registerTool(asyncToolHandler("index_docs", {
    description: "Index documents into memory. Async task with AEP lifecycle events.",
    inputSchema: {
      properties: {
        path: { type: "string", description: "Path to documents" }
      },
      required: ["path"]
    },
    work: async (args) => {
      await sleep(delayMs);
      return { documents_indexed: 150, path: args.path };
    }
  }));

  return { bridge, transport };
}

export async function runMcpAepConsumerDemo(options = {}) {
  const { bridge, transport } = createDemoBridge(options);
  await transport.start();

  try {
    await expectMcpSuccess(await bridge.handleRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "0.1.0", capabilities: {}, clientInfo: { name: "mcp-aep-consumer", version: "1.0.0" } }
    }), { method: "initialize" });

    const toolsResponse = await expectMcpSuccess(await bridge.handleRequest({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {}
    }), { method: "tools/list" });

    const callSpecs = [
      { id: 3, toolName: "web_crawl", arguments: { _task_id: "task_demo_web_crawl", url: "https://example.com", depth: 2 } },
      { id: 4, toolName: "index_docs", arguments: { _task_id: "task_demo_index_docs", path: "/docs" } }
    ];

    const calls = [];
    for (const spec of callSpecs) {
      const response = await bridge.handleRequest({
        jsonrpc: "2.0",
        id: spec.id,
        method: "tools/call",
        params: { name: spec.toolName, arguments: spec.arguments }
      });
      const task = parseTaskResult(response, { method: "tools/call", toolName: spec.toolName });
      calls.push({ tool: spec.toolName, arguments: spec.arguments, ...task });
    }

    const timelines = await waitForTaskTimelines(
      transport,
      calls.map((call) => call.task_id),
      { timeoutMs: options.timeoutMs ?? 1000 }
    );

    return {
      tools: toolsResponse.result.tools,
      calls: calls.map((call) => ({ ...call, events: timelines.get(call.task_id) ?? [] }))
    };
  } finally {
    await transport.stop();
  }
}

export function parseTaskResult(response, context = {}) {
  if (response?.error) {
    throw new Error(`MCP ${context.method ?? "request"} for ${context.toolName ?? "unknown"} failed: ${response.error.message}`);
  }

  const text = response?.result?.content?.find((item) => item.type === "text")?.text;
  if (typeof text !== "string") {
    throw new Error(`MCP ${context.toolName ?? "tool"} response did not include text content`);
  }

  if (response?.result?.isError) {
    throw new Error(`MCP ${context.method ?? "request"} for ${context.toolName ?? "unknown"} failed: ${text}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`MCP ${context.toolName ?? "tool"} response text was not JSON: ${err.message}`);
  }

  if (!parsed.task_id) {
    throw new Error(`MCP ${context.toolName ?? "tool"} response did not include task_id`);
  }

  return parsed;
}

export function groupEventsByTask(events) {
  const grouped = new Map();
  for (const event of events) {
    if (!event?.type?.startsWith("task.") || !event.task_id) continue;
    if (!grouped.has(event.task_id)) grouped.set(event.task_id, []);
    grouped.get(event.task_id).push(event);
  }
  return grouped;
}

export async function waitForTaskTimelines(transport, taskIds, options = {}) {
  const timeoutMs = options.timeoutMs ?? 1000;
  const startedAt = Date.now();

  while (Date.now() - startedAt <= timeoutMs) {
    const events = transport.sent
      .map((message) => typeof message === "string" ? JSON.parse(message) : message)
      .filter(Boolean);
    const grouped = groupEventsByTask(events);

    if (taskIds.every((taskId) => grouped.get(taskId)?.some((event) => TERMINAL_TASK_EVENTS.has(event.type)))) {
      return grouped;
    }

    await sleep(10);
  }

  throw new Error(`Timed out waiting for terminal AEP events for tasks: ${taskIds.join(", ")}`);
}

async function expectMcpSuccess(response, context) {
  if (response?.error) {
    throw new Error(`MCP ${context.method} failed: ${response.error.message}`);
  }
  return response;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
