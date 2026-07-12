# gRPC Transport Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** Add gRPC bidirectional streaming transport to TypeScript, completing the Phase 2 later bindings.

**Architecture:** Follows existing transport pattern (Transport base class). Proto file defines a single bidirectional streaming RPC. JSON-encoded AEP envelopes travel as gRPC message payloads. Both server and client transports extend `Transport`.

**Tech Stack:** Node ESM, `@grpc/grpc-js`, `@grpc/proto-loader` (dev), existing Transport base class.

---

## File Structure

- Create: `docs/specs/transport-grpc.md` â€?gRPC transport specification
- Create: `implementations/typescript/src/transport/aep.proto` â€?service definition
- Create: `implementations/typescript/src/transport/grpc.js` â€?GrpcServerTransport + GrpcClientTransport
- Create: `implementations/typescript/test/transport-grpc.test.js` â€?integration tests
- Modify: `implementations/typescript/package.json` â€?add `@grpc/grpc-js` dep, `@grpc/proto-loader` devDep
- Modify: `docs/roadmap.md` â€?mark gRPC as implemented
- Modify: `README.md` â€?add gRPC spec link

---

### Task 1: Spec, Proto, And Implementation

**Files:**
- Create: `docs/specs/transport-grpc.md`
- Create: `implementations/typescript/src/transport/aep.proto`
- Create: `implementations/typescript/src/transport/grpc.js`
- Modify: `implementations/typescript/package.json`

- [ ] **Step 1: Add gRPC dependencies**

In `implementations/typescript/package.json`, add:
```json
"@grpc/grpc-js": "^1.11.0"
```
And to devDependencies (if not present, add the block):
```json
"@grpc/proto-loader": "^0.7.0"
```

Run `cd implementations/typescript && npm install`.

- [ ] **Step 2: Create gRPC transport spec**

Create `docs/specs/transport-grpc.md` following the same structure as `transport-websocket.md`:

- **Purpose:** gRPC bidirectional streaming for AEP.
- **Service:** `AepTransport.Stream` â€?bidirectional streaming RPC.
- **Framing:** Each gRPC message carries one JSON-encoded AEP envelope. No protobuf schema for the envelope itself â€?the payload is a JSON string.
- **Connection:** gRPC metadata carries session/authorization headers. gRPC status codes map to AEP errors.
- **Session Lifecycle:** stream open â†?session opened, stream error â†?session error, stream close â†?session closed.
- **Heartbeat:** gRPC keepalive pings serve as transport-level heartbeat.

- [ ] **Step 3: Create proto file**

Create `implementations/typescript/src/transport/aep.proto`:

```protobuf
syntax = "proto3";

package aep.v1;

service AepTransport {
  rpc Stream(stream AepMessage) returns (stream AepMessage);
}

message AepMessage {
  string json_payload = 1;
}
```

- [ ] **Step 4: Implement gRPC transport**

Create `implementations/typescript/src/transport/grpc.js`:

- `GrpcServerTransport` extends `Transport`:
  - `_onStart()` loads proto, creates gRPC server, binds to `0.0.0.0:port`, implements `Stream(call)` handler
  - `Stream` handler: on `call.on("data")` â†?`this.emit("message", parsed JSON)`
  - `send(event)` â†?`call.write({ json_payload: JSON.stringify(event) })`
  - `_onStop()` â†?`server.forceShutdown()`

- `GrpcClientTransport` extends `Transport`:
  - `_onStart()` loads proto, creates gRPC client, opens bidirectional stream
  - `call.on("data")` â†?`this.emit("message", parsed JSON)`
  - `send(event)` â†?`call.write({ json_payload: JSON.stringify(event) })`
  - `_onStop()` â†?`call.end()`

- Follow the same pattern as `MockStdioTransport` and `WsServerTransport` â€?use `#private` fields, `emit("message")`, `emit("connection")`.

- [ ] **Step 5: Verify compilation**

```bash
cd implementations/typescript && node -e "import('./src/transport/grpc.js')"
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add docs/specs/transport-grpc.md implementations/typescript/src/transport/aep.proto implementations/typescript/src/transport/grpc.js implementations/typescript/package.json
git commit -m "feat: add gRPC transport spec and TypeScript implementation"
```

---

### Task 2: gRPC Transport Tests

**Files:**
- Create: `implementations/typescript/test/transport-grpc.test.js`

- [ ] **Step 1: Write failing tests**

Create `implementations/typescript/test/transport-grpc.test.js` with tests matching the existing transport test patterns (`transport-ws.test.js`):

- `gRPC server starts and accepts connections` â€?start server on port 0, verify it's listening
- `gRPC client connects and exchanges messages` â€?client connects, sends event, server receives, server sends response, client receives
- `gRPC bidirectional streaming` â€?both sides send multiple events, verify all received in order
- `gRPC server shutdown stops cleanly` â€?stop server, verify client stream ends

Follow the same async/await pattern as the WebSocket tests.

- [ ] **Step 2: Run test to verify failure**

```bash
cd implementations/typescript && npm test -- test/transport-grpc.test.js
```

Expected: FAIL then PASS after implementation.

- [ ] **Step 3: Run focused tests**

```bash
cd implementations/typescript && npm test -- test/transport-grpc.test.js
```

Expected: ~4 tests pass.

- [ ] **Step 4: Run all tests**

```bash
cd implementations/typescript && npm test
```

Expected: ~106 tests pass (102 existing + 4 new), 0 failures.

- [ ] **Step 5: Commit**

```bash
git add implementations/typescript/test/transport-grpc.test.js
git commit -m "test: add gRPC transport tests"
```

---

### Task 3: Documentation, Verification, Push

**Files:**
- Modify: `docs/roadmap.md` â€?mark gRPC as implemented in Phase 2
- Modify: `README.md` â€?add gRPC spec link

- [ ] **Step 1: Update roadmap**

In `docs/roadmap.md`, change the gRPC line:
```markdown
- gRPC streaming (`docs/specs/transport-grpc.md`, implemented in `implementations/typescript/src/transport/grpc.js`)
```

- [ ] **Step 2: Update README documents list**

Add to the specs list:
```markdown
- `docs/specs/transport-grpc.md` â€?gRPC streaming transport specification
```

- [ ] **Step 3: Full verification**

```bash
cd implementations/typescript && npm test && npm run conformance
node tools/conformance-runner.js
```

- [ ] **Step 4: Commit and push**

```bash
git add docs/roadmap.md README.md
git commit -m "docs: document gRPC transport"
git status --short
git push
```
