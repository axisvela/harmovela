# Python Transport Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** Add stdio, WebSocket, SSE, and gRPC transport implementations to Python, matching TypeScript transport parity.

**Architecture:** Transport base class + 4 transport implementations following existing TS patterns. stdio and SSE use Python stdlib only. WebSocket uses `websockets`, gRPC uses `grpcio`. Each transport gets TDD-style tests.

**Tech Stack:** Python 3.12, `websockets`, `grpcio`+`grpcio-tools`, pytest.

---

## File Structure

- Modify: `implementations/python/pyproject.toml` â€?add websockets, grpcio
- Modify: `implementations/python/src/aep/transport/__init__.py` â€?exports
- Create: `implementations/python/src/aep/transport/base.py` â€?Transport base class
- Create: `implementations/python/src/aep/transport/stdio.py` â€?StdioTransport
- Create: `implementations/python/src/aep/transport/websocket.py` â€?WsServer + WsClient
- Create: `implementations/python/src/aep/transport/sse.py` â€?SseServerTransport
- Create: `implementations/python/src/aep/transport/grpc.py` â€?GrpcServer + GrpcClient
- Create: `implementations/python/src/aep/transport/aep.proto` â€?same as TS
- Create: `implementations/python/tests/test_transport_stdio.py`
- Create: `implementations/python/tests/test_transport_ws.py`
- Create: `implementations/python/tests/test_transport_sse.py`
- Create: `implementations/python/tests/test_transport_grpc.py`

---

### Task 1: Transport Base + stdio

**Files:** base.py, stdio.py, test_transport_stdio.py, transport/__init__.py

- [ ] TDD: 3-4 stdio tests (parse NDJSON, capture sent data, ignore empty lines, malformed JSON)
- [ ] Implement Transport base class + StdioTransport extending it
- [ ] `python -m pytest tests/test_transport_stdio.py -q` â†?PASS
- [ ] Commit: `feat: add Python stdio transport`

### Task 2: WebSocket Transport

**Files:** websocket.py, test_transport_ws.py, pyproject.toml

- [ ] Add `websockets` to pyproject.toml dependencies
- [ ] TDD: 4 tests (server start, client connect + exchange, bidirectional, shutdown)
- [ ] Implement WsServerTransport + WsClientTransport extending base
- [ ] `python -m pytest tests/test_transport_ws.py -q` â†?PASS
- [ ] Commit: `feat: add Python WebSocket transport`

### Task 3: SSE Transport

**Files:** sse.py, test_transport_sse.py

- [ ] TDD: 3 tests (server serves text/event-stream, ingest endpoint accepts POST, rejects invalid JSON)
- [ ] Implement SseServerTransport using stdlib `http.server`
- [ ] `python -m pytest tests/test_transport_sse.py -q` â†?PASS
- [ ] Commit: `feat: add Python SSE transport`

### Task 4: gRPC Transport

**Files:** grpc.py, aep.proto, test_transport_grpc.py, pyproject.toml

- [ ] Add `grpcio`, `grpcio-tools` to pyproject.toml
- [ ] Copy TS aep.proto or create identical one
- [ ] TDD: 4 tests (server start, client connect + exchange, bidirectional, shutdown)
- [ ] Implement GrpcServerTransport + GrpcClientTransport
- [ ] `python -m pytest tests/test_transport_grpc.py -q` â†?PASS
- [ ] Commit: `feat: add Python gRPC transport`

### Task 5: Docs, Verification, Push

- [ ] Update `implementations/python/README.md` scope â€?add transport bindings
- [ ] Update `implementations/python/src/aep/transport/__init__.py` exports
- [ ] Full verification: `python -m pytest --tb=short -q` (~94 tests)
- [ ] Cross-lang: `node tools/conformance-runner.js`
- [ ] Push
