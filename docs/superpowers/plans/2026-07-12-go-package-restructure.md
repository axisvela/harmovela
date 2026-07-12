# Go Package Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the Go `aep/` flat package into sub-packages: core (`aep/`), store (`aep/store/`), transport (`aep/transport/`), runtime (`aep/runtime/`), bridge (`aep/bridge/`), with no circular dependencies.

**Architecture:** Dependency graph is acyclic: core → (store, transport, bridge) → runtime. cmd packages import runtime + transport. Each task moves files, changes the package declaration, adds imports to the moved package for referenced symbols from other packages, and exports any previously unexported symbols now needed cross-package.

**Dependency order (enforced by implementation sequence):**
1. core (`aep/`): self-contained — no imports from sub-packages. Exports helpers from `delivery_store.go` that store needs.
2. store (`aep/store/`): imports core, exports nothing that core needs (one-way dependency).
3. transport (`aep/transport/`): imports core, exports nothing that core needs.
4. bridge (`aep/bridge/`): imports core (harness, task, errors).
5. runtime (`aep/runtime/`): imports core + store + transport (the most dependent package).
6. cmd packages: update imports to point at runtime + transport.

**Critical exports:**
- `Now()` in core (`aep/util.go`) — used by runtime to build event timestamps.
- `DeliveryStore` interface stays in store; runtime imports it.
- `WsBroadcastServer` stays in transport; runtime imports it.

---

## Task 1: Create core helper `Now()` and move store package

**Files:**
- Create: `reference/go/aep/util.go` — exported `func Now() string`
- Move: 10 delivery files to `aep/store/`
- Use the `now()` helper in store internally; remove cross-package dependency on `Now()`

- [ ] **Step 1: Create util.go in root package**

```go
package aep

import "time"

func Now() string {
	return time.Now().UTC().Format(time.RFC3339)
}
```

- [ ] **Step 2: Move store files**

```bash
mkdir -p reference/go/aep/store
git mv reference/go/aep/delivery_store.go reference/go/aep/store/
git mv reference/go/aep/delivery_store_test.go reference/go/aep/store/
git mv reference/go/aep/delivery_sqlite.go reference/go/aep/store/
git mv reference/go/aep/delivery_sqlite_test.go reference/go/aep/store/
git mv reference/go/aep/delivery_postgres.go reference/go/aep/store/
git mv reference/go/aep/delivery_postgres_test.go reference/go/aep/store/
git mv reference/go/aep/delivery.go reference/go/aep/store/
git mv reference/go/aep/delivery_test.go reference/go/aep/store/
git mv reference/go/aep/delivery_journal.go reference/go/aep/store/
git mv reference/go/aep/delivery_journal_test.go reference/go/aep/store/
```

- [ ] **Step 3: Change package declaration in moved files**

Each store/*.go: `package aep` → `package store`.

- [ ] **Step 4: The `now()` helper already exists in store/delivery_store.go** — no change needed; store uses its own private `now()`.

- [ ] **Step 5: Build store package**

Run: `cd reference/go && go build ./aep/store/`
Expected: compile — the store package imports nothing from outside stdlib + `github.com/axisrobo/aep` (which is `aep` root for shared constants/types).

- [ ] **Step 6: Build root package without store files**

Run: `cd reference/go && go build ./aep/`
Expected: root package must still compile without store files, since root does not import store.

- [ ] **Step 7: Build cmd packages**

Run: `cd reference/go && go build ./cmd/aep/ ./cmd/aepd/`
Expected: they fail because `cmd/aep` imports `aep.DeliveryStore`, etc. — this is expected until runtime package is fixed. Note that store is a separate sub-package now.

- [ ] **Step 8: Commit and push**

```bash
git add reference/go/aep/store/ reference/go/aep/util.go
git commit -m "refactor(go): extract store sub-package from flat aep"
git push origin master
```

---

## Task 2: Move transport package

**Files:**
- Move: all `transport_*.go` files to `aep/transport/`

- [ ] **Step 1: Move files**

```bash
git mv reference/go/aep/transport_ws.go reference/go/aep/transport/
git mv reference/go/aep/transport_ws_test.go reference/go/aep/transport/
git mv reference/go/aep/transport_ws_broadcast.go reference/go/aep/transport/
git mv reference/go/aep/transport_ws_broadcast_test.go reference/go/aep/transport/
git mv reference/go/aep/transport_sse.go reference/go/aep/transport/
git mv reference/go/aep/transport_sse_test.go reference/go/aep/transport/
git mv reference/go/aep/transport_stdio.go reference/go/aep/transport/
git mv reference/go/aep/transport_stdio_test.go reference/go/aep/transport/
git mv reference/go/aep/transport_grpc.go reference/go/aep/transport/
git mv reference/go/aep/transport_grpc_test.go reference/go/aep/transport/
git mv reference/go/aep/transport_kafka.go reference/go/aep/transport/
git mv reference/go/aep/transport_kafka_test.go reference/go/aep/transport/
git mv reference/go/aep/transport_nats.go reference/go/aep/transport/
git mv reference/go/aep/transport_nats_test.go reference/go/aep/transport/
git mv reference/go/aep/transport_redis.go reference/go/aep/transport/
git mv reference/go/aep/transport_redis_test.go reference/go/aep/transport/
```

- [ ] **Step 2: Rename package to `package transport`** in all moved files.

- [ ] **Step 3: Export `upgrader` var**

Change `var upgrader = ...` to `var Upgrader = ...` in the WS files so the broadcast server can use it. Update references.

- [ ] **Step 4: Build transport package**

Run: `cd reference/go && go build ./aep/transport/`
- [ ] **Step 5: Commit and push**

```bash
git add reference/go/aep/transport/
git commit -m "refactor(go): extract transport sub-package from flat aep"
git push origin master
```

---

## Task 3: Move bridge package

**Files:**
- Move: `mcp_bridge.go`, `mcp_bridge_test.go` to `aep/bridge/`

- [ ] **Step 1: Move files**

```bash
git mv reference/go/aep/mcp_bridge.go reference/go/aep/bridge/
git mv reference/go/aep/mcp_bridge_test.go reference/go/aep/bridge/
```

- [ ] **Step 2: Package declaration → `package bridge`**

- [ ] **Step 3: Import root package**

Bridge references `Harness`, `NewHarness`, `TaskTracker`, `NewTaskTracker`, `ErrorCodeToolError`, `ErrorPayload`, `Accepted`, `Started`, `Progress`, `Completed`, `Failed`.

These are in the root `aep/` package. Add:

```go
import "github.com/axisrobo/aep/aep"
```

And qualify all references: `aep.Harness`, `aep.NewHarness`, `aep.TaskTracker`, etc.

Same in test file. `Sender` is defined in bridge itself; move it.

- [ ] **Step 4: Build bridge package**

Run: `cd reference/go && go build ./aep/bridge/`
- [ ] **Step 5: Commit and push**

```bash
git add reference/go/aep/bridge/
git commit -m "refactor(go): extract bridge sub-package from flat aep"
git push origin master
```

---

## Task 4: Move runtime package (complex — imports core + store + transport)

**Files:**
- Move: `runtime.go`, `runtime_test.go`, `runtime_subscriptions_test.go` to `aep/runtime/`

- [ ] **Step 1: Move files**

```bash
git mv reference/go/aep/runtime.go reference/go/aep/runtime/
git mv reference/go/aep/runtime_test.go reference/go/aep/runtime/
git mv reference/go/aep/runtime_subscriptions_test.go reference/go/aep/runtime/
```

- [ ] **Step 2: Package declaration → `package runtime`**

- [ ] **Step 3: Add imports**

The runtime package now needs imports from the root `aep/` package, `aep/store/`, and `aep/transport/`:

```go
import (
    "github.com/axisrobo/aep/aep"
    "github.com/axisrobo/aep/aep/store"
    "github.com/axisrobo/aep/aep/transport"
)
```

- [ ] **Step 4: Qualify all cross-package references**

Root-level symbols used in runtime:
- `ValidateEnvelope` → `aep.ValidateEnvelope`
- `MatchesType` → `aep.MatchesType`
- `SubscriptionMatches` → `aep.SubscriptionMatches`
- `Now()` → `aep.Now()`
- `EventRouter` → `aep.EventRouter` (if used in runtime? not — the runtime uses router internally)
- Actually, runtime doesn't use EventRouter — it uses subscription pattern matching directly.

Store symbols:
- `DeliveryStore` → `store.DeliveryStore`
- `NewInMemoryDeliveryStore` → `store.NewInMemoryDeliveryStore`
- `NewSqliteDeliveryStore` → `store.NewSqliteDeliveryStore`
- `NewPostgresDeliveryStore` → `store.NewPostgresDeliveryStore`
- `PostgresOptions` → `store.PostgresOptions`
- `CreateDeliveryStore` references same — qualifies.

Transport symbols:
- `WsBroadcastServer` → `transport.WsBroadcastServer`
- `NewWsBroadcastServer` → `transport.NewWsBroadcastServer`

- [ ] **Step 5: Add private `now()` helper** and remove old `Now()` reference

Runtime has its own `now()` helper; changes in step 4 already handle the `Now()` move.

- [ ] **Step 6: Build runtime package**

Run: `cd reference/go && go build ./aep/runtime/`
Expected: compile — runtime depends on core + store + transport with no circular imports.

- [ ] **Step 7: Update runtime tests** — same import qualification changes.

- [ ] **Step 8: Run runtime tests**

Run: `cd reference/go && go test ./aep/runtime/`
Expected: PASS.

- [ ] **Step 9: Commit and push**

```bash
git add reference/go/aep/runtime/
git commit -m "refactor(go): extract runtime sub-package from flat aep"
git push origin master
```

---

## Task 5: Update cmd packages

**Files:**
- Modify: `reference/go/cmd/aep/main.go`, `reference/go/cmd/aepd/main.go`

- [ ] **Step 1: Update cmd/aep imports**

`cmd/aep` imports `aep.WriteDefaultConfig`, `aep.LoadConfig`, `aep.CreateDeliveryStore`, `aep.MatchesType`, `aep.Now`, `aep.NewRuntimeService`.

After restructure:
- `aep.WriteDefaultConfig` → `runtime.WriteDefaultConfig` (moved to runtime) — wait, `WriteDefaultConfig` is in runtime.go, so it moves to runtime package.
- Actually, I need to check: what symbols in runtime.go does cmd/aep use?

Running through cmd/aep/main.go:
- `aep.WriteDefaultConfig` → now `runtime.WriteDefaultConfig`
- `aep.LoadConfig` → `runtime.LoadConfig`  
- `aep.NewRuntimeService` → `runtime.NewRuntimeService`
- `aep.CreateDeliveryStore` → `runtime.CreateDeliveryStore` (factory is in runtime)
- `aep.Now` → `aep.Now()` (still in root)
- `aep.MatchesType` → `aep.MatchesType` (still in root)
- `aep.ApplyEnvOverrides` → `runtime.ApplyEnvOverrides` (in runtime)
- `aep.DefaultConfig` → `runtime.DefaultConfig`
- `aep.RunTimeConfig` → `runtime.RunTimeConfig`

Also cmd/aep uses `gorilla/websocket` directly for `emit` and `subscribe` — stays as-is (transport import).

Update cmd/aep/main.go to import:

```go
import (
    "github.com/axisrobo/aep/aep"
    "github.com/axisrobo/aep/aep/runtime"
)
```

And qualify all runtime symbols with `runtime.`, root symbols with `aep.`.

Also, the old `import "github.com/axisrobo/aep/aep"` imports are currently `aep` — the root package; no rename needed there.

- [ ] **Step 2: Update cmd/aepd imports**

Same pattern: import runtime and root packages.

- [ ] **Step 3: Build cmd packages**

Run: `cd reference/go && go build ./cmd/aep/ ./cmd/aepd/`
- [ ] **Step 4: Verify full suite**

Run: `cd reference/go && go test ./...`
- [ ] **Step 5: Commit and push**

```bash
git add reference/go/cmd/
git commit -m "refactor(go): update cmd packages for sub-package imports"
git push origin master
```

---

## Task 6: Final verification

- [ ] **Step 1: Run full Go suite**

Run: `cd reference/go && go test ./...`

- [ ] **Step 2: Build all binaries**

Run: `cd reference/go && go build ./...`

- [ ] **Step 3: Verify git sync**

Run: `git status -sb`
Expected: clean, `## master...origin/master`.
