# Extract Event Transports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move transport implementations (stdio, WebSocket, SSE, gRPC wrappers, NATS, Kafka, Redis) from each language's aep namespace into the existing independent Event module under transport/, while preserving all proto filenames, generated identifiers, subprotocol strings, and endpoint defaults. Legacy aep harness/runtime/CLI must import Event transport public APIs; no Event transport may import aep.

**Architecture:** Four independent language blocks executed sequentially. Each block: (1) update transport tests RED to import from new Event transport paths, (2) move transport source files to Event module transport/ directory, (3) update aep harness/runtime/CLI imports to point at new Event transport paths, (4) verify tests GREEN, commit per language. Files that import aep internals (Go ws.go, Go transport_grpc.go, Python grpc.py) need their aep dependencies broken before moving.

**Tech Stack:** TypeScript (Node.js built-in test runner), Python (pytest or unittest), Go (standard testing), Java (JUnit 5)

---

### Task 1: TypeScript - Extract Event Transports

**Goal:** Move all transports from `src/transport/` to `packages/event/src/transport/`, update the event package re-exports, and redirect aep imports.

**Current state:**
- Transports in: `implementations/typescript/src/transport/`
- Event module: `implementations/typescript/packages/event/src/`
- aep consumers: `src/index.js`, `src/runtime/service.js`, `src/stdio.js`, `src/bridge/mcp-aep-consumer.js`
- Tests: `implementations/typescript/test/transport-*.test.js`

**Move plan (all files go to `packages/event/src/transport/`):**

| Source | Destination |
|--------|-------------|
| `src/transport/base.js` | `packages/event/src/transport/base.js` |
| `src/transport/stdio.js` | `packages/event/src/transport/stdio.js` |
| `src/transport/websocket.js` | `packages/event/src/transport/websocket.js` |
| `src/transport/sse.js` | `packages/event/src/transport/sse.js` |
| `src/transport/grpc.js` | `packages/event/src/transport/grpc.js` |
| `src/transport/nats.js` | `packages/event/src/transport/nats.js` |
| `src/transport/kafka.js` | `packages/event/src/transport/kafka.js` |
| `src/transport/redis.js` | `packages/event/src/transport/redis.js` |
| `src/transport/aep.proto` | `packages/event/src/transport/aep.proto` |

- [ ] **Step 1: Update ALL transport tests to import from new Event transport paths (RED)**

Update each test file in `test/transport-*.test.js` to import from `@axisrobo/harmovela-event`:

```javascript
// test/transport-stdio.test.js - change import from:
import { MockStdioTransport } from "../src/transport/stdio.js";
// to:
import { MockStdioTransport } from "@axisrobo/harmovela-event";
```

Do the same for `test/transport-ws.test.js`, `test/transport-sse.test.js`, `test/transport-grpc.test.js`, `test/transport-nats.test.js`, `test/transport-kafka.test.js`, `test/transport-redis.test.js`.

Verify tests FAIL (RED) because transports haven't been added to event package exports yet:

```bash
node --test test/transport-stdio.test.js test/transport-ws.test.js test/transport-sse.test.js test/transport-grpc.test.js test/transport-nats.test.js test/transport-kafka.test.js test/transport-redis.test.js
```

- [ ] **Step 2: Move transport source files to Event module**

Copy all files from `src/transport/` to `packages/event/src/transport/` (create dir if needed).

- [ ] **Step 3: Update Event package exports**

Add transport re-exports to `packages/event/src/index.js`:

```javascript
export { Transport } from "./transport/base.js";
export { StdioTransport, MockStdioTransport } from "./transport/stdio.js";
export { WsServerTransport, WsClientTransport } from "./transport/websocket.js";
export { SseServerTransport, SseClientTransport } from "./transport/sse.js";
export { GrpcServerTransport, GrpcClientTransport } from "./transport/grpc.js";
export { NatsTransport } from "./transport/nats.js";
export { KafkaTransport } from "./transport/kafka.js";
export { RedisTransport } from "./transport/redis.js";
```

- [ ] **Step 4: Update aep `src/index.js` to re-export from Event transport**

Change lines 8-11 in `src/index.js` from:
```javascript
export { Transport } from "./transport/base.js";
export { StdioTransport, MockStdioTransport } from "./transport/stdio.js";
export { WsServerTransport, WsClientTransport } from "./transport/websocket.js";
export { SseServerTransport, SseClientTransport } from "./transport/sse.js";
```
to:
```javascript
export { Transport, StdioTransport, MockStdioTransport, WsServerTransport, WsClientTransport, SseServerTransport, SseClientTransport } from "@axisrobo/harmovela-event";
```

Also re-export GrpcServerTransport, GrpcClientTransport, NatsTransport, KafkaTransport, RedisTransport if needed.

- [ ] **Step 5: Update `src/runtime/service.js`** to import transports from event module

Change lines 4-5 from:
```javascript
import { WsServerTransport } from "../transport/websocket.js";
import { SseServerTransport } from "../transport/sse.js";
```
to:
```javascript
import { WsServerTransport, SseServerTransport } from "@axisrobo/harmovela-event";
```

- [ ] **Step 6: Update `src/stdio.js`** to import StdioTransport from event module

Change line 2 from:
```javascript
import { StdioTransport } from "./transport/stdio.js";
```
to:
```javascript
import { StdioTransport } from "@axisrobo/harmovela-event";
```

- [ ] **Step 7: Update `src/bridge/mcp-aep-consumer.js`** to import MockStdioTransport from event module

Change line 2 from:
```javascript
import { MockStdioTransport } from "../transport/stdio.js";
```
to:
```javascript
import { MockStdioTransport } from "@axisrobo/harmovela-event";
```

- [ ] **Step 8: Remove original transport files from `src/transport/`**

Delete all files in `src/transport/` directory (the directory should be empty or removed).

- [ ] **Step 9: Run ALL tests to verify GREEN**

```bash
npm test
```

- [ ] **Step 10: Commit TypeScript changes**

```bash
git add implementations/typescript/
git commit -m "refactor: extract Event transports - TS"
```

---

### Task 2: Python - Extract Event Transports

**Goal:** Move transport implementations from `src/aep/transport/` to `src/axisrobo_harmovela_event/transport/`, update imports.

**Current state:**
- Transports in: `implementations/python/src/aep/transport/`
- Event module: `implementations/python/src/axisrobo_harmovela_event/`
- aep consumers: `aep/__init__.py`, `aep/runtime/service.py`
- Tests: `implementations/python/tests/test_transport_*.py`

**Move plan (all files go to `src/axisrobo_harmovela_event/transport/`):**

| Source | Destination |
|--------|-------------|
| `aep/transport/__init__.py` | `axisrobo_harmovela_event/transport/__init__.py` |
| `aep/transport/base.py` | `axisrobo_harmovela_event/transport/base.py` |
| `aep/transport/stdio.py` | `axisrobo_harmovela_event/transport/stdio.py` |
| `aep/transport/websocket.py` | `axisrobo_harmovela_event/transport/websocket.py` |
| `aep/transport/sse.py` | `axisrobo_harmovela_event/transport/sse.py` |
| `aep/transport/grpc.py` | `axisrobo_harmovela_event/transport/grpc.py` |
| `aep/transport/aep_pb2.py` | `axisrobo_harmovela_event/transport/aep_pb2.py` |
| `aep/transport/aep_pb2_grpc.py` | `axisrobo_harmovela_event/transport/aep_pb2_grpc.py` |
| `aep/transport/redis.py` | `axisrobo_harmovela_event/transport/redis.py` |
| `aep/transport/kafka.py` | `axisrobo_harmovela_event/transport/kafka.py` |
| `aep/transport/nats.py` | `axisrobo_harmovela_event/transport/nats.py` |

- [ ] **Step 1: Update transport test imports to use new Event transport paths (RED)**

Update each test file in `tests/test_transport_*.py` to import from `axisrobo_harmovela_event.transport`:

```python
# tests/test_transport_stdio.py - change import from:
from aep.transport import StdioTransport
# to:
from axisrobo_harmovela_event.transport import StdioTransport
```

Repeat for all test files.

- [ ] **Step 2: Move transport source files to Event module**

Create `src/axisrobo_harmovela_event/transport/` directory. Copy all transport files into it.

- [ ] **Step 3: Fix `grpc.py` internal imports**

In the moved `axisrobo_harmovela_event/transport/grpc.py`, change lines 8-9 from:
```python
from . import aep_pb2
from . import aep_pb2_grpc
```
These relative imports will work correctly since aep_pb2.py and aep_pb2_grpc.py are co-located. No change needed, but verify.

- [ ] **Step 4: Fix `aep_pb2_grpc.py` internal import**

In the moved `axisrobo_harmovela_event/transport/aep_pb2_grpc.py`, change the import from:
```python
from aep.transport import aep_pb2 as aep_dot_transport_dot_aep__pb2
```
to:
```python
from axisrobo_harmovela_event.transport import aep_pb2 as aep_dot_transport_dot_aep__pb2
```
Or use a relative import:
```python
from . import aep_pb2 as aep_dot_transport_dot_aep__pb2
```

- [ ] **Step 5: Update Event module `__init__.py`** to expose transports

Add to `axisrobo_harmovela_event/__init__.py`:
```python
from .transport import (
    Transport,
    StdioTransport,
    WsServerTransport,
    WsClientTransport,
    SseServerTransport,
    GrpcServerTransport,
    GrpcClientTransport,
)
```

- [ ] **Step 6: Update `aep/__init__.py`** to import transports from event module

No change needed currently - aep/__init__.py doesn't export transports directly.

- [ ] **Step 7: Update `aep/runtime/service.py`** to import from event transport

Change line 5 from:
```python
from ..transport.websocket import WsServerTransport
```
to:
```python
from axisrobo_harmovela_event.transport.websocket import WsServerTransport
```

- [ ] **Step 8: Remove original transport files from `aep/transport/`**

Delete all files in `aep/transport/` and the directory itself (excluding __pycache__).

- [ ] **Step 9: Run transport tests to verify GREEN**

```bash
cd implementations/python && python -m pytest tests/test_transport_*.py -v
```

- [ ] **Step 10: Commit Python changes**

```bash
git add implementations/python/
git commit -m "refactor: extract Event transports - Python"
```

---

### Task 3: Go - Extract Event Transports

**Goal:** Move transport implementations from `aep/transport/` to `event/transport/`. Handle aep-dependent files (ws.go, transport_grpc.go) by defining needed types in event transport.

**Current state:**
- Transport files: `aep/transport/stdio.go`, `sse.go`, `ws.go`, `ws_broadcast.go`, `nats.go`, `kafka.go`, `redis.go` + test files
- gRPC transport: `aep/transport_grpc.go` (in `aep` package, uses generated gRPC types)
- Event module: `event/` (package `event`)
- Aep consumers: `aep/runtime/runtime.go` imports `aep/transport`

**Move plan:**

| Source | Destination | Notes |
|--------|-------------|-------|
| `aep/transport/stdio.go` | `event/transport/stdio.go` | No aep dependency |
| `aep/transport/sse.go` | `event/transport/sse.go` | No aep dependency |
| `aep/transport/ws_broadcast.go` | `event/transport/ws_broadcast.go` | No aep dependency |
| `aep/transport/nats.go` | `event/transport/nats.go` | No aep dependency |
| `aep/transport/kafka.go` | `event/transport/kafka.go` | No aep dependency |
| `aep/transport/redis.go` | `event/transport/redis.go` | No aep dependency |
| `aep/transport/ws.go` | `event/transport/ws.go` | Imports aep - FIX |
| `aep/transport_grpc.go` | Leave in `aep/` | Depends on generated gRPC code in aep package |
| Test files | `event/transport/*_test.go` | Same destinations as source files |

**For `ws.go`**: This file imports `aep` for `MessageHandler`, `ReceiveHandler`, `HarmovelaMessage`. To move it, define equivalent types in event/transport. Change the file to use `map[string]any` instead of `*aep.HarmovelaMessage`. This changes the internal wire format slightly but not the protocol.

Actually, `ws.go`'s WsServer and WsClient are heavily tied to `aep.HarmovelaMessage` (the gRPC proto message). The simpler approach: keep ws.go under aep/transport/package when it needs aep types, and move only the truly independent transports. Or better: define a `Message` struct in event/transport and have aep/transport/ws.go adapt.

Wait - re-reading the requirement: "Move transport implementations... into each language's existing independent Event module". The ws.go file is a transport implementation. The approach: move it to event/transport and use a plain struct instead of the gRPC proto message.

But `harmovelaMessage` is: `{ JsonPayload string }` (from proto). We can define:
```go
type Message struct {
    JsonPayload string
}
```
in event/transport and use that. Then in the aep layer, convert as needed.

- [ ] **Step 1: Create `event/transport/` directory and define `Message` type**

Create `event/transport/message.go`:
```go
package transport

type MessageHandler func(msg *Message) *Message
type ReceiveHandler func(msg *Message)

type Message struct {
    JsonPayload string
}
```

- [ ] **Step 2: Move independent transport files to `event/transport/`**

Move: stdio.go, sse.go, ws_broadcast.go, nats.go, kafka.go, redis.go

Update package declaration from `package transport` to `package transport` (same, since they're already in package transport).

- [ ] **Step 3: Move `ws.go` and adapt to use event/transport types**

Move ws.go to `event/transport/ws.go`. Change imports:
- Remove `"github.com/axisrobo/harmovela/aep"` import
- Change `aep.MessageHandler` to `MessageHandler`, `aep.ReceiveHandler` to `ReceiveHandler`, `*aep.HarmovelaMessage` to `*Message`
- Use the local `Message` struct defined in message.go

- [ ] **Step 4: Move test files to `event/transport/`**

Move: stdio_test.go, sse_test.go, ws_test.go, ws_broadcast_test.go, nats_test.go, kafka_test.go, redis_test.go

Update test file imports - they use `NewStdioTransport(reader, &buf)` with unqualified calls (already in same package, no import needed).

- [ ] **Step 5: Update `aep/runtime/runtime.go` imports**

Change line 17 from:
```go
"github.com/axisrobo/harmovela/aep/transport"
```
to:
```go
eventtransport "github.com/axisrobo/harmovela/event/transport"
```

Update references in runtime.go from `transport.WsBroadcastServer` and `transport.NewWsBroadcastServer` to `eventtransport.WsBroadcastServer` and `eventtransport.NewWsBroadcastServer`.

- [ ] **Step 6: Update `aep/transport_grpc.go` imports if needed**

This file is in `aep` package and uses `HarmovelaMessage` generated type. It may reference `aep/transport` types - check and update if needed. Most likely no change needed since it's in the aep package.

- [ ] **Step 7: Remove original files from `aep/transport/`**

Delete the moved files from `aep/transport/`. Keep only what remains (nothing if all moved, or just the directory).

- [ ] **Step 8: Run Go transport tests to verify GREEN**

```bash
cd implementations/go && go test ./event/transport/... -v
```

- [ ] **Step 9: Run full Go test suite**

```bash
cd implementations/go && go test ./... -v
```

- [ ] **Step 10: Commit Go changes**

```bash
git add implementations/go/
git commit -m "refactor: extract Event transports - Go"
```

---

### Task 4: Java - Extract Event Transports

**Goal:** Move transport classes from `com.axisrobo.aep.transport` to `com.axisrobo.harmovela.event.transport`, update package declarations and imports.

**Current state:**
- Transport src: `src/main/java/com/axisrobo/aep/transport/`
- Transport tests: `src/test/java/com/axisrobo/aep/transport/`
- Event module: `src/main/java/com/axisrobo/harmovela/event/`
- Aep consumers: `aep/runtime/HarmovelaRuntimeService.java`, `aep/cli/HarmovelaCli.java`

**Move plan:**

| Source | Destination |
|--------|-------------|
| `com.axisrobo.aep.transport.StdioTransport` | `com.axisrobo.harmovela.event.transport.StdioTransport` |
| `com.axisrobo.aep.transport.WsServer` | `com.axisrobo.harmovela.event.transport.WsServer` |
| `com.axisrobo.aep.transport.WsClient` | `com.axisrobo.harmovela.event.transport.WsClient` |
| `com.axisrobo.aep.transport.SseServer` | `com.axisrobo.harmovela.event.transport.SseServer` |
| `com.axisrobo.aep.transport.GrpcServer` | `com.axisrobo.harmovela.event.transport.GrpcServer` |
| `com.axisrobo.aep.transport.GrpcClient` | `com.axisrobo.harmovela.event.transport.GrpcClient` |
| `com.axisrobo.aep.transport.NatsTransport` | `com.axisrobo.harmovela.event.transport.NatsTransport` |
| `com.axisrobo.aep.transport.KafkaTransport` | `com.axisrobo.harmovela.event.transport.KafkaTransport` |
| `com.axisrobo.aep.transport.RedisTransport` | `com.axisrobo.harmovela.event.transport.RedisTransport` |

Test files move similarly.

- [ ] **Step 1: Move transport source files to new package directory**

Create `src/main/java/com/axisrobo/harmovela/event/transport/`. Move all Java files from `src/main/java/com/axisrobo/aep/transport/` there.

- [ ] **Step 2: Update package declarations in moved files (RED)**

Change every moved file's package declaration from:
```java
package com.axisrobo.aep.transport;
```
to:
```java
package com.axisrobo.harmovela.event.transport;
```

- [ ] **Step 3: Update imports in moved transport files**

Check each moved transport file for imports that reference the old package. For example, if StdioTransport.java doesn't import other transport classes, no change needed. If WsServer references aep classes, update those.

- [ ] **Step 4: Move test files to new package directory**

Move test files from `src/test/java/com/axisrobo/aep/transport/` to `src/test/java/com/axisrobo/harmovela/event/transport/`.

- [ ] **Step 5: Update package declarations in test files**

Change package declarations in test files from `com.axisrobo.aep.transport` to `com.axisrobo.harmovela.event.transport`.

- [ ] **Step 6: Update `HarmovelaRuntimeService.java` import**

Change line 5 from:
```java
import com.axisrobo.aep.transport.WsServer;
```
to:
```java
import com.axisrobo.harmovela.event.transport.WsServer;
```

- [ ] **Step 7: Update `HarmovelaCli.java` import**

Change line 6 from:
```java
import com.axisrobo.aep.transport.WsClient;
```
to:
```java
import com.axisrobo.harmovela.event.transport.WsClient;
```

- [ ] **Step 8: Remove old transport directory**

Delete `src/main/java/com/axisrobo/aep/transport/` and `src/test/java/com/axisrobo/aep/transport/` directories.

- [ ] **Step 9: Compile and run Java tests to verify GREEN**

```bash
cd implementations/java && ./gradlew test  # or mvn test
```

If no build tool config found, check the project structure for the correct build command.

- [ ] **Step 10: Commit Java changes**

```bash
git add implementations/java/
git commit -m "refactor: extract Event transports - Java"
```
