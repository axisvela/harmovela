# Go Transport Parity (stdio + WebSocket + SSE) Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended).

**Goal:** Add stdio, WebSocket, and SSE transports to Go, achieving full transport parity with TypeScript and Python.

**Architecture:** Three standalone Go structs following existing gRPC transport pattern. stdio and SSE use stdlib only. WebSocket uses `gorilla/websocket`.

---

### Task 1: stdio Transport

**Files:** `transport_stdio.go`, `transport_stdio_test.go` (stdlib, zero deps)

- [ ] TDD: 3-4 tests (parse NDJSON, capture sent, empty lines, malformed JSON)
- [ ] Implement `StdioTransport` with `Start()/Stop()/Send()/Read()` using `bufio.Scanner`
- [ ] `go test ./aep/ -run TestStdio -v` â†?PASS, full suite ~53 pass
- [ ] Commit: `feat: add Go stdio transport`

### Task 2: SSE Transport

**Files:** `transport_sse.go`, `transport_sse_test.go` (stdlib `net/http`)

- [ ] TDD: 3 tests (serves text/event-stream, POST ingest, rejects bad JSON)
- [ ] Implement `SseServer` using `net/http` + `http.Handler`
- [ ] `go test ./aep/ -run TestSse -v` â†?PASS, full suite ~56 pass
- [ ] Commit: `feat: add Go SSE transport`

### Task 3: WebSocket Transport

**Files:** `transport_ws.go`, `transport_ws_test.go`, `go.mod` (dep: `gorilla/websocket`)

- [ ] `go get github.com/gorilla/websocket`
- [ ] TDD: 4 tests (server start, exchange, bidirectional, shutdown)
- [ ] Implement `WsServer` + `WsClient` with `Start/Stop/Send/Read`
- [ ] `go test ./aep/ -run TestWs -v` â†?PASS, full suite ~60 pass
- [ ] Commit: `feat: add Go WebSocket transport`

### Task 4: Docs, Verify, Push

- [ ] Update `implementations/go/README.md` scope â€?list all 4 transports
- [ ] Full verify: `go test ./aep/ -v` (~60 tests), `node tools/conformance-runner.js`
- [ ] Push
