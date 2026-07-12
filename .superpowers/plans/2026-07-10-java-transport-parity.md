# Java Transport Parity Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended).

**Goal:** Add stdio, SSE, WebSocket, and gRPC transports to Java, achieving full 4-language transport parity.

**Architecture:** Four standalone transport classes following same TDD pattern as Go. stdio and SSE use stdlib only. WebSocket uses `org.java-websocket`. gRPC uses `io.grpc` + protobuf.

---

## File Structure

- Create: `implementations/java/src/main/java/com/axisrobo/aep/transport/StdioTransport.java`
- Create: `implementations/java/src/main/java/com/axisrobo/aep/transport/SseServer.java`
- Create: `implementations/java/src/main/java/com/axisrobo/aep/transport/WsServer.java`
- Create: `implementations/java/src/main/java/com/axisrobo/aep/transport/WsClient.java`
- Create: `implementations/java/src/main/java/com/axisrobo/aep/transport/GrpcServer.java`
- Create: `implementations/java/src/main/java/com/axisrobo/aep/transport/GrpcClient.java`
- Create corresponding test files in `implementations/java/src/test/java/com/axisrobo/aep/transport/`
- Modify: `implementations/java/pom.xml` â€?add WS + gRPC deps

---

### Task 1: stdio Transport (stdlib, zero deps)

- [ ] TDD: 3-4 tests (parse NDJSON, capture sent, empty lines, malformed JSON)
- [ ] Implement `StdioTransport` with `start/stop/send/read`
- [ ] `mvn test -pl . -Dtest=StdioTransportTest -q` â†?PASS
- [ ] Commit: `feat: add Java stdio transport`

### Task 2: SSE Transport (stdlib, zero deps)

- [ ] TDD: 3 tests (serves text/event-stream, POST ingest, rejects invalid)
- [ ] Implement `SseServer` using `com.sun.net.httpserver.HttpServer`
- [ ] `mvn test -pl . -Dtest=SseServerTest -q` â†?PASS
- [ ] Commit: `feat: add Java SSE transport`

### Task 3: WebSocket Transport

- [ ] Add `org.java-websocket:Java-WebSocket:1.5.6` to pom.xml
- [ ] TDD: 4 tests (server start, exchange, bidirectional, shutdown)
- [ ] Implement `WsServer` + `WsClient`
- [ ] `mvn test -pl . -Dtest=WsTransportTest -q` â†?PASS
- [ ] Commit: `feat: add Java WebSocket transport`

### Task 4: gRPC Transport

- [ ] Add `io.grpc:*` + protobuf deps to pom.xml
- [ ] Copy `aep.proto`, generate Java code
- [ ] TDD: 4 tests (server start, exchange, bidirectional, shutdown)
- [ ] Implement `GrpcServer` + `GrpcClient`
- [ ] `mvn test -pl . -Dtest=GrpcTransportTest -q` â†?PASS
- [ ] Commit: `feat: add Java gRPC transport`

### Task 5: Docs, Verify, Push

- [ ] Update `implementations/java/README.md` scope â€?list transports
- [ ] Full verify: `mvn test -q` (~62 total), `node tools/conformance-runner.js`
- [ ] Push
