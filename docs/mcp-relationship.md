# Harmovela And MCP

## Summary

Harmovela is the asynchronous counterpart to MCP.

MCP standardizes how a model or agent synchronously invokes capabilities. Harmovela standardizes how agents, tools, memory systems, context providers, and environments communicate asynchronously.

They should be complementary protocols.

## Why MCP Alone Is Not Enough

MCP is centered on request-response interactions:

- List tools
- Call a tool
- List resources
- Read a resource
- List prompts
- Get a prompt

This is a strong model for synchronous capability invocation, but many agent workflows are event-driven:

- A long-running tool needs to report progress.
- A background indexing task completes later.
- A memory fact is invalidated after the agent already used it.
- An environment observer detects a relevant change.
- Another agent finishes a subtask.
- A task needs cancellation or timeout handling.
- A disconnected agent needs to replay missed events.

These are not naturally represented as a single synchronous tool result.

## Why HTTPS Request-Response Is Not The Async Layer

HTTPS request-response, whether used for an MCP call or another API, is useful for submitting work and receiving an immediate acknowledgement. It does not by itself provide a shared stream for changes that occur after that exchange.

For a long-running operation, submission and acceptance are distinct from progress and the terminal result:

```text
Agent --MCP/HTTPS--> submit ingest_document
Tool  --MCP/HTTPS--> accepted (task_id)
Tool  --Harmovela--------> task.progress (task_id)
Tool  --Harmovela--------> task.completed | task.failed | task.cancelled (task_id)
```

The same async layer lets a producer report external state changes, such as a memory invalidation or an environment observation, without a consumer first making a request. It also provides a place for cancellation to be communicated while work is in flight and for a reconnecting consumer to request replay of missed events. These are draft Harmovela lifecycle and delivery conventions, not a claim that MCP cannot expose notifications or extensions.

## Correspondence Table

| MCP Capability | Harmovela Counterpart |
| --- | --- |
| `initialize` | `session.opened`, `session.ready`, capability negotiation |
| `tools/list` | `capabilities.requested`, `capabilities.declared` |
| `tools/call` | `tool.call.requested`, lifecycle events |
| `resources/list` | `streams/list` or subscription capabilities |
| `resources/read` | `context.snapshot.requested`, `context.snapshot.ready` |
| `notifications/*` | General event publish / subscribe |
| Request-response result | Deferred result stream |

## Interop Model

### MCP Tool Calls Producing Harmovela Events

A synchronous MCP tool may perform a write or trigger background processing. The tool can return immediately while publishing Harmovela events later.

Example:

```text
Agent --MCP--> call tool: ingest_document
Tool --MCP--> returns accepted result
Tool --Harmovela--> task.progress
Tool --Harmovela--> memory.summary.ready
Tool --Harmovela--> task.completed
```

### Harmovela Events Requesting MCP Tool Calls

Harmovela can carry an event that asks a runtime to execute an MCP tool asynchronously.

```json
{
  "type": "tool.call.requested",
  "payload": {
    "protocol": "mcp",
    "server": "mneme",
    "tool": "search_memory",
    "arguments": {
      "query": "async agent protocols"
    }
  }
}
```

The result is emitted as Harmovela lifecycle events rather than returned synchronously.

### MCP For Current State, Harmovela For Change Over Time

MCP can read a current resource snapshot. Harmovela can notify agents that the snapshot changed.

```text
MCP: read current context
Harmovela: context.updated / context.invalidated
```

## Design Boundary

Harmovela should not attempt to duplicate every MCP feature. It should not become a second synchronous tool protocol.

Harmovela should define:

- Event envelope
- Subscription model
- Async task lifecycle
- Delivery semantics
- Context and memory event types
- Agent-to-agent message events

MCP should continue to define:

- Synchronous tool discovery
- Synchronous tool invocation
- Resource reading
- Prompt retrieval

## Naming Recommendation

Avoid calling the project "Async MCP".

Recommended framing:

> Harmovela is the event layer for agent systems. MCP is the call layer.

This keeps the protocol independent, general, and useful beyond the MCP ecosystem while still allowing first-class MCP integration.
