# Examples Directory Redesign And Reference Rename

Date: 2026-07-12
Status: approved for implementation planning

## Part 1: Rename `implementations/` â†?`implementations/`

### Rationale

Each language under `implementations/` is now a fully productized implementation with runtime, daemon, CLI, HTTP API, subscriptions, MCP bridge, and delivery stores. "Reference" implies read-only example code; "implementations" accurately describes runnable, production-capable protocol implementations.

### Scope

- `git mv implementations/ implementations/`
- Update all path references in:
  - `AGENTS.md`, `CLAUDE.md`
  - `README.md`, `README_zh.md`
  - `design/superpowers/specs/*.md` and `design/superpowers/plans/*.md`
  - `design/roadmap.md`, `design/vision.md`, `design/architecture.md`, `design/protocol-design.md`
  - `conformance/manifest.json` (if any paths)
  - `tools/conformance-runner.js`
  - `docs/site/` (if generated)
  - `opencode.json`
- TypeScript npm workspace path in root `package.json` (`"workspaces": ["implementations/typescript"]` â†?`"implementations/typescript"]`)
- `CONTRIBUTING.md`

### Not Changed

- Go module path (`github.com/axisrobo/aep`) stays â€?it's independent of the directory name.
- TypeScript package name (`@axisrobo/aep`) stays.
- Python package name (`aep-reference-python` in pyproject.toml) stays â€?internal package name unchanged.
- Java Maven artifact name stays.
- Internal source code does not reference `implementations/` â€?only docs and config files reference it.

---

## Part 2: Examples Directory Restructure

### Design

Top-level scenes, files distinguished by language suffix:

```
examples/
  README.md
  quickstart/
    runtime-embed.js
    runtime-embed.py
    runtime-embed.go
    runtime-embed.java
  service-client/
    emit-subscribe.js
    http-subscribe.js
    http-subscribe.py
    http-subscribe.go
    http-subscribe.java
  mcp-bridge/
    async-tool.js
    async-tool.py
    async-tool.go
    async-tool.java
  scenarios/
    agent-subscriber.js
    memory-producer.js
```

### Scene Definitions

| Scene | Purpose | Languages (first pass) |
|---|---|---|
| `quickstart/` | Minimal in-process runtime: create service, subscribe, publish one event, receive it. | TS (existing), Python, Go, Java |
| `service-client/` | Connect to running `aepd` over HTTP API and WebSocket. | TS (existing + new http-subscribe), Python, Go, Java |
| `mcp-bridge/` | Embed `McpBridge` with `asyncToolHandler`, call tool, assert lifecycle events. | TS (new), Python, Go, Java |
| `scenarios/` | End-to-end domain scenarios: agent subscriber pattern, memory event producer. | TS (existing 2 files) |

### Future Scenarios

`scenarios/` is designed to grow:
- `scenarios/task-orchestration.js` â€?async task lifecycle across tool calls
- `scenarios/langgraph-agent.js` â€?LangGraph integration
- `scenarios/crewai-agent.py` â€?CrewAI Python integration
- `scenarios/autogen-agent.py` â€?AutoGen integration

Each scenario stays language-specific (one file = one language example). A scenario worth implementing in multiple languages gets suffixed files.

### File Naming

- Suffix `.js` (TypeScript/Node), `.py` (Python), `.go` (Go reference), `.java` (Java reference; in reality the file is inside a Java package â€?use a `Scenarios.java` or similar class name).
- README.md in each scene directory describes the scene and lists per-language files.

### Migration Of Existing Examples

```
examples/sdk/runtime-embed.js          â†?examples/quickstart/runtime-embed.js
examples/sdk/agent-subscriber.js       â†?examples/scenarios/agent-subscriber.js
examples/sdk/memory-event-producer.js  â†?examples/scenarios/memory-producer.js
examples/service/emit-and-subscribe.js â†?examples/service-client/emit-subscribe.js
examples/service/http-api-client.js    â†?examples/service-client/http-subscribe.js (rename)
```

Existing `examples/README.md` and top-level references updated.

### New Examples To Create

- `examples/quickstart/runtime-embed.py` â€?minimal AEP runtime in-process: create, subscribe, publish, receive.
- `examples/quickstart/runtime-embed.go` â€?same in Go.
- `examples/quickstart/runtime-embed.java` â€?same in Java.
- `examples/service-client/http-subscribe.js` â€?HTTP create subscription, emit event, long-poll / SSE stream receive.
- `examples/mcp-bridge/async-tool.js` â€?`McpBridge` + `asyncToolHandler`, call tool, await lifecycle.

Other languages for service-client and mcp-bridge are left for later rounds.

### README Update

Top-level `examples/README.md` rewritten to describe scenes and list per-language files with copy-paste run commands.

---

## Part 3: Implementation Sequence

1. Rename `implementations/` â†?`implementations/` with path updates â†?commit + push.
2. Restructure `examples/` directories â†?commit + push.
3. Add new example files â†?commit + push.
4. Update top-level README with new paths â†?commit + push.
