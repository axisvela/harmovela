# Go Delivery Parity + SQLite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add InMemoryDeliveryStore, DeliveryJournal, DeliveryTracker, and SqliteDeliveryStore to Go, matching the TypeScript/Python/Java delivery subsystem.

**Architecture:** DeliveryStore interface with InMemory + SQLite implementations. DeliveryTracker delegates to store + journal. Same 4-table schema as other languages.

**Tech Stack:** Go 1.21+, `modernc.org/sqlite` (pure Go, no CGo), `testing` stdlib.

---

## File Structure

- Create: `implementations/go/aep/delivery_store.go` â€?DeliveryStore interface + InMemoryDeliveryStore
- Create: `implementations/go/aep/delivery_journal.go` â€?DeliveryJournal
- Create: `implementations/go/aep/delivery.go` â€?DeliveryTracker + retryDelay
- Create: `implementations/go/aep/delivery_sqlite.go` â€?SqliteDeliveryStore
- Create: `implementations/go/aep/delivery_store_test.go` â€?8 tests
- Create: `implementations/go/aep/delivery_journal_test.go` â€?6 tests
- Create: `implementations/go/aep/delivery_test.go` â€?9 tests
- Create: `implementations/go/aep/delivery_sqlite_test.go` â€?7 tests
- Modify: `implementations/go/go.mod` â€?add modernc.org/sqlite if Task 4 runs

---

### Task 1: InMemoryDeliveryStore + Tests

**Files:**
- Create: `implementations/go/aep/delivery_store.go`
- Create: `implementations/go/aep/delivery_store_test.go`

- [ ] **Step 1: Write failing test**

Create `implementations/go/aep/delivery_store_test.go`:

```go
package aep

import (
	"testing"
)

func TestInMemoryDeliveryStoreTracksAndAcknowledges(t *testing.T) {
	store := NewInMemoryDeliveryStore(0, "stream_01")
	seq := store.Track("evt_001", "sub_01")
	if seq != 1 { t.Fatalf("expected seq 1, got %d", seq) }
	if !store.IsPending("evt_001") { t.Fatal("expected pending") }
	if store.IsAcknowledged("evt_001") { t.Fatal("expected not acked") }
	if !store.Ack("evt_001") { t.Fatal("ack failed") }
	if !store.IsAcknowledged("evt_001") { t.Fatal("expected acked") }
	if store.IsPending("evt_001") { t.Fatal("expected not pending") }
}

func TestInMemoryDeliveryStoreNackIncrements(t *testing.T) {
	store := NewInMemoryDeliveryStore(0, "stream_01")
	store.Track("evt_001", "sub_01")
	attempts := store.Nack("evt_001")
	if attempts != 2 { t.Fatalf("expected 2, got %v", attempts) }
	pending := store.GetPending()
	if len(pending) != 1 { t.Fatalf("expected 1 pending, got %d", len(pending)) }
	if pending[0]["attempts"] != 2 { t.Fatalf("expected 2 attempts, got %v", pending[0]["attempts"]) }
}

func TestInMemoryDeliveryStoreDeadLetters(t *testing.T) {
	store := NewInMemoryDeliveryStore(0, "stream_01")
	store.Track("evt_001", "sub_01")
	dlq := store.DeadLetter("evt_001", map[string]any{"error": map[string]any{"code": "timeout"}})
	if dlq == nil { t.Fatal("expected dead letter event") }
	if dlq["type"] != "event.dead_lettered" { t.Fatalf("expected dead_lettered, got %v", dlq["type"]) }
}

// ... remaining 5 tests matching TS/Python/Java
```

(Implementer: add all 8 tests matching other languages: track+ack, nack, deadLetter, stats, nack unknown, deadLetter unknown, hasAttemptsRemaining, getPendingForSubscription)

- [ ] **Step 2: Run `go test ./aep/ -run TestInMemory -v` â€?expected FAIL**

- [ ] **Step 3: Implement** â€?DeliveryStore interface + InMemoryDeliveryStore in `delivery_store.go`

- [ ] **Step 4: Run tests â€?8 PASS. Run all Go tests â€?pass.**

- [ ] **Step 5: Commit** `git add implementations/go/aep/delivery_store.go implementations/go/aep/delivery_store_test.go && git commit -m "feat: add Go InMemoryDeliveryStore with tests"`

---

### Task 2: DeliveryJournal + Tests

**Files:**
- Create: `implementations/go/aep/delivery_journal.go`
- Create: `implementations/go/aep/delivery_journal_test.go`

(Implementer: follow the same TDD pattern as Task 1. 6 tests: append, replay, replayAll, purge, stats, emptyStats. Implement DeliveryJournal with same API as TS/Python/Java.)

- [ ] **Commit** `git commit -m "feat: add Go DeliveryJournal with tests"`

---

### Task 3: DeliveryTracker + Tests

**Files:**
- Create: `implementations/go/aep/delivery.go`
- Create: `implementations/go/aep/delivery_test.go`

(Implementer: TDD. 9 tests: retryDelay, tracker tracks+ack+nack+deadLetter+getPending+stats+store injection. DeliveryTracker accepts DeliveryStore interface + DeliveryJournal.)

- [ ] **Commit** `git commit -m "feat: add Go DeliveryTracker with store and journal"`

---

### Task 4: SqliteDeliveryStore + Docs + Push

**Files:**
- Create: `implementations/go/aep/delivery_sqlite.go`
- Create: `implementations/go/aep/delivery_sqlite_test.go`
- Modify: `implementations/go/go.mod`
- Modify: `implementations/go/README.md`

(Implementer: TDD. 7 tests using `:memory:` database. Add `modernc.org/sqlite` dep via `go get`. Same 4-table schema. Update README scope. Run full Go tests. Run cross-language verification. Push.)

- [ ] **Commit** `git commit -m "feat: add Go SqliteDeliveryStore with tests"` then `git commit -m "docs: update Go delivery scope"`
