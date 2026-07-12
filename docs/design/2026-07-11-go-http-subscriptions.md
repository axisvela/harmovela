# Go HTTP Subscriptions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Go runtime to parity with TypeScript HTTP subscriptions: subscription persistence in every delivery store, a runtime subscription registry with buffered fanout, and HTTP subscription CRUD + long-poll + SSE endpoints.

**Architecture:** A `SubscriptionMatches` helper extends the existing `MatchesType`. Delivery stores gain subscription CRUD behind the `DeliveryStore` interface. `RuntimeService` gains a mutex-guarded subscription registry that loads persisted subscriptions on start, fans matching events into per-subscription buffers on publish, and exposes drain/attach. The `net/http` api mux adds subscription routes, long-poll, and SSE via `http.Flusher`.

**Tech Stack:** Go 1.25, stdlib `net/http`, `google/uuid`, `go test`.

**Design reference:** `docs/superpowers/specs/2026-07-11-multi-language-http-subscriptions-design.md`

---

## File Structure

- Modify `implementations/go/aep/subscription.go`: add `SubscriptionMatches`.
- Modify `implementations/go/aep/delivery_store.go` (interface + in-memory), `delivery_sqlite.go`, `delivery_postgres.go`: subscription CRUD.
- Modify `implementations/go/aep/runtime.go`: registry, fanout, endpoints, long-poll, SSE.
- Add tests alongside.

---

## Task 1: SubscriptionMatches helper

**Files:**
- Modify: `implementations/go/aep/subscription.go`
- Test: `implementations/go/aep/subscription_test.go`

- [ ] **Step 1: Write failing test**

Append to `implementations/go/aep/subscription_test.go`:

```go
func TestSubscriptionMatches(t *testing.T) {
	event := map[string]any{"type": "task.submitted", "source": "agent:x"}
	if !SubscriptionMatches(map[string]any{"types": "task.*"}, event) {
		t.Fatal("expected type match")
	}
	if SubscriptionMatches(map[string]any{"types": "memory.*"}, event) {
		t.Fatal("expected type mismatch")
	}
	if !SubscriptionMatches(map[string]any{"types": "task.*", "source": "agent:x"}, event) {
		t.Fatal("expected source match")
	}
	if SubscriptionMatches(map[string]any{"source": "agent:y"}, event) {
		t.Fatal("expected source mismatch")
	}
	if !SubscriptionMatches(map[string]any{}, event) {
		t.Fatal("empty filter should match")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd implementations/go && go test ./aep/ -run TestSubscriptionMatches`
Expected: build failure, `SubscriptionMatches` undefined.

- [ ] **Step 3: Implement SubscriptionMatches**

Append to `implementations/go/aep/subscription.go`:

```go
// SubscriptionMatches reports whether an event satisfies a subscription filter.
// The filter may contain "types" (a type pattern) and equality fields
// "source", "target", "topic", "session_id", "conversation_id", "task_id".
func SubscriptionMatches(filter map[string]any, event map[string]any) bool {
	if types, ok := filter["types"]; ok && types != nil {
		typ, _ := event["type"].(string)
		if !matchesTypeValue(types, typ) {
			return false
		}
	}
	for _, field := range []string{"source", "target", "topic", "session_id", "conversation_id", "task_id"} {
		expected, ok := filter[field]
		if !ok || expected == nil {
			continue
		}
		if !matchesValue(expected, event[field]) {
			return false
		}
	}
	return true
}

func matchesTypeValue(patterns any, value string) bool {
	switch p := patterns.(type) {
	case string:
		return MatchesType(p, value)
	case []any:
		for _, item := range p {
			if s, ok := item.(string); ok && MatchesType(s, value) {
				return true
			}
		}
		return false
	case []string:
		for _, s := range p {
			if MatchesType(s, value) {
				return true
			}
		}
		return false
	}
	return false
}

func matchesValue(expected any, actual any) bool {
	switch e := expected.(type) {
	case string:
		s, _ := actual.(string)
		return e == s
	case []any:
		for _, item := range e {
			if item == actual {
				return true
			}
		}
		return false
	case []string:
		s, _ := actual.(string)
		for _, item := range e {
			if item == s {
				return true
			}
		}
		return false
	}
	return expected == actual
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd implementations/go && go test ./aep/ -run "TestSubscriptionMatches|TestMatchesType"`
Expected: PASS.

- [ ] **Step 5: Commit and push**

```bash
git add implementations/go/aep/subscription.go implementations/go/aep/subscription_test.go
git commit -m "feat(go): add SubscriptionMatches filter helper"
git push origin master
```

---

## Task 2: Delivery store subscription CRUD

**Files:**
- Modify: `implementations/go/aep/delivery_store.go`
- Modify: `implementations/go/aep/delivery_sqlite.go`
- Modify: `implementations/go/aep/delivery_postgres.go`
- Test: `implementations/go/aep/delivery_store_test.go`

- [ ] **Step 1: Write failing test**

Append to `implementations/go/aep/delivery_store_test.go`:

```go
func TestInMemorySubscriptionCRUD(t *testing.T) {
	store := NewInMemoryDeliveryStore(0, "stream_01")
	store.CreateSubscription(map[string]any{"id": "sub_1", "filter": map[string]any{"types": "task.*"}, "created_at": "2026-07-11T10:00:00Z"})
	got := store.GetSubscription("sub_1")
	if got == nil {
		t.Fatal("expected subscription")
	}
	if len(store.ListSubscriptions()) != 1 {
		t.Fatalf("expected 1, got %d", len(store.ListSubscriptions()))
	}
	if !store.DeleteSubscription("sub_1") {
		t.Fatal("expected delete true")
	}
	if store.GetSubscription("sub_1") != nil {
		t.Fatal("expected nil after delete")
	}
	if store.DeleteSubscription("sub_1") {
		t.Fatal("expected delete false")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd implementations/go && go test ./aep/ -run TestInMemorySubscriptionCRUD`
Expected: build failure, `CreateSubscription` undefined.

- [ ] **Step 3: Extend the interface**

In `implementations/go/aep/delivery_store.go`, add to the `DeliveryStore` interface after `GetDeadLettered`:

```go
	CreateSubscription(record map[string]any) map[string]any
	GetSubscription(id string) map[string]any
	ListSubscriptions() []map[string]any
	DeleteSubscription(id string) bool
```

- [ ] **Step 4: Implement in-memory subscription CRUD**

In `implementations/go/aep/delivery_store.go`, add a `subscriptions` field to the `InMemoryDeliveryStore` struct:

```go
	subscriptions map[string]map[string]any
```

Initialize it in `NewInMemoryDeliveryStore` (add to the struct literal):

```go
		subscriptions: make(map[string]map[string]any),
```

Add methods:

```go
func (s *InMemoryDeliveryStore) CreateSubscription(record map[string]any) map[string]any {
	id, _ := record["id"].(string)
	s.subscriptions[id] = record
	return record
}

func (s *InMemoryDeliveryStore) GetSubscription(id string) map[string]any {
	return s.subscriptions[id]
}

func (s *InMemoryDeliveryStore) ListSubscriptions() []map[string]any {
	result := make([]map[string]any, 0, len(s.subscriptions))
	for _, v := range s.subscriptions {
		result = append(result, v)
	}
	return result
}

func (s *InMemoryDeliveryStore) DeleteSubscription(id string) bool {
	if _, ok := s.subscriptions[id]; !ok {
		return false
	}
	delete(s.subscriptions, id)
	return true
}
```

- [ ] **Step 5: Implement sqlite subscription CRUD**

In `implementations/go/aep/delivery_sqlite.go` `migrate()`, add a table to the schema string:

```go
	CREATE TABLE IF NOT EXISTS delivery_subscriptions (
		id TEXT PRIMARY KEY,
		filter TEXT NOT NULL,
		created_at TEXT NOT NULL
	);
```

Add methods:

```go
func (s *SqliteDeliveryStore) CreateSubscription(record map[string]any) map[string]any {
	id, _ := record["id"].(string)
	createdAt, _ := record["created_at"].(string)
	filterJSON, _ := json.Marshal(record["filter"])
	s.db.Exec(`INSERT OR REPLACE INTO delivery_subscriptions (id, filter, created_at) VALUES (?, ?, ?)`,
		id, string(filterJSON), createdAt)
	return record
}

func (s *SqliteDeliveryStore) GetSubscription(id string) map[string]any {
	row := s.db.QueryRow(`SELECT id, filter, created_at FROM delivery_subscriptions WHERE id = ?`, id)
	return scanSubscription(row.Scan)
}

func (s *SqliteDeliveryStore) ListSubscriptions() []map[string]any {
	rows, err := s.db.Query(`SELECT id, filter, created_at FROM delivery_subscriptions ORDER BY created_at`)
	if err != nil {
		return nil
	}
	defer rows.Close()
	result := make([]map[string]any, 0)
	for rows.Next() {
		if sub := scanSubscription(rows.Scan); sub != nil {
			result = append(result, sub)
		}
	}
	return result
}

func (s *SqliteDeliveryStore) DeleteSubscription(id string) bool {
	res, err := s.db.Exec(`DELETE FROM delivery_subscriptions WHERE id = ?`, id)
	if err != nil {
		return false
	}
	n, _ := res.RowsAffected()
	return n > 0
}

func scanSubscription(scan func(dest ...any) error) map[string]any {
	var id, filterStr, createdAt string
	if err := scan(&id, &filterStr, &createdAt); err != nil {
		return nil
	}
	var filter map[string]any
	json.Unmarshal([]byte(filterStr), &filter)
	return map[string]any{"id": id, "filter": filter, "created_at": createdAt}
}
```

`encoding/json` is already imported in `delivery_sqlite.go`.

- [ ] **Step 6: Implement postgres subscription CRUD**

In `implementations/go/aep/delivery_postgres.go` `migrate()`, add a table:

```go
	CREATE TABLE IF NOT EXISTS %s (
		id TEXT PRIMARY KEY,
		filter JSONB NOT NULL,
		created_at TEXT NOT NULL
	);
```

Add `s.t("subscriptions")` to the `fmt.Sprintf` argument list for the schema, matching the existing pattern. Read the `migrate` function first to align the format-string argument order.

Add methods:

```go
func (s *PostgresDeliveryStore) CreateSubscription(record map[string]any) map[string]any {
	id, _ := record["id"].(string)
	createdAt, _ := record["created_at"].(string)
	filterJSON, _ := json.Marshal(record["filter"])
	s.db.Exec(fmt.Sprintf(
		`INSERT INTO %s (id, filter, created_at) VALUES ($1,$2,$3)
		 ON CONFLICT (id) DO UPDATE SET filter=EXCLUDED.filter, created_at=EXCLUDED.created_at`,
		s.t("subscriptions")), id, string(filterJSON), createdAt)
	return record
}

func (s *PostgresDeliveryStore) GetSubscription(id string) map[string]any {
	row := s.db.QueryRow(fmt.Sprintf(`SELECT id, filter, created_at FROM %s WHERE id = $1`, s.t("subscriptions")), id)
	return scanPgSubscription(row.Scan)
}

func (s *PostgresDeliveryStore) ListSubscriptions() []map[string]any {
	rows, err := s.db.Query(fmt.Sprintf(`SELECT id, filter, created_at FROM %s ORDER BY created_at`, s.t("subscriptions")))
	if err != nil {
		return nil
	}
	defer rows.Close()
	result := make([]map[string]any, 0)
	for rows.Next() {
		if sub := scanPgSubscription(rows.Scan); sub != nil {
			result = append(result, sub)
		}
	}
	return result
}

func (s *PostgresDeliveryStore) DeleteSubscription(id string) bool {
	res, err := s.db.Exec(fmt.Sprintf(`DELETE FROM %s WHERE id = $1`, s.t("subscriptions")), id)
	if err != nil {
		return false
	}
	n, _ := res.RowsAffected()
	return n > 0
}

func scanPgSubscription(scan func(dest ...any) error) map[string]any {
	var id, createdAt string
	var filterBytes []byte
	if err := scan(&id, &filterBytes, &createdAt); err != nil {
		return nil
	}
	var filter map[string]any
	json.Unmarshal(filterBytes, &filter)
	return map[string]any{"id": id, "filter": filter, "created_at": createdAt}
}
```

If `Close` with `dropOnClose` drops tables, add `s.t("subscriptions")` to the DROP list. Read `Close` first and align.

- [ ] **Step 7: Run store tests**

Run: `cd implementations/go && go test ./aep/ -run "SubscriptionCRUD|Postgres"`
Expected: PASS.

- [ ] **Step 8: Commit and push**

```bash
git add implementations/go/aep/delivery_store.go implementations/go/aep/delivery_sqlite.go implementations/go/aep/delivery_postgres.go implementations/go/aep/delivery_store_test.go
git commit -m "feat(go): add subscription CRUD to delivery stores"
git push origin master
```

---

## Task 3: Runtime registry, endpoints, long-poll, SSE

**Files:**
- Modify: `implementations/go/aep/runtime.go`
- Test: `implementations/go/aep/runtime_subscriptions_test.go`

- [ ] **Step 1: Write failing tests**

Create `implementations/go/aep/runtime_subscriptions_test.go`:

```go
package aep

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"
)

func subApiConfig(port int) RuntimeConfig {
	c := DefaultConfig()
	c.Delivery.Store = "memory"
	c.Transports.WebSocket.Enabled = false
	c.Transports.SSE.Enabled = false
	c.Transports.API.Enabled = true
	c.Transports.API.Host = "127.0.0.1"
	c.Transports.API.Port = port
	return c
}

func TestRuntimeSubscriptionRegistry(t *testing.T) {
	c := DefaultConfig()
	c.Delivery.Store = "memory"
	c.Transports.WebSocket.Enabled = false
	c.Transports.SSE.Enabled = false
	c.Transports.API.Enabled = false
	svc := NewRuntimeService(c)
	svc.Start()
	defer svc.Stop()
	record := svc.CreateSubscription(map[string]any{"types": "task.*"})
	id := record["id"].(string)
	svc.Publish(map[string]any{"aep_version": "0.1", "id": "evt_match", "type": "task.submitted", "source": "t", "created_at": "2026-07-11T10:00:00Z", "payload": map[string]any{}})
	svc.Publish(map[string]any{"aep_version": "0.1", "id": "evt_skip", "type": "session.opened", "source": "t", "created_at": "2026-07-11T10:00:00Z", "payload": map[string]any{}})
	drained := svc.TakeEvents(id, 100)
	if len(drained) != 1 {
		t.Fatalf("expected 1, got %d", len(drained))
	}
	if drained[0]["id"] != "evt_match" {
		t.Fatalf("expected evt_match, got %v", drained[0]["id"])
	}
}

func TestRuntimeSubscriptionEndpoints(t *testing.T) {
	port := freePort(t)
	svc := NewRuntimeService(subApiConfig(port))
	svc.Start()
	defer svc.Stop()
	time.Sleep(200 * time.Millisecond)
	base := fmt.Sprintf("http://127.0.0.1:%d/aep/api", port)

	resp, _ := http.Post(base+"/subscriptions", "application/json", strings.NewReader(`{"filter":{"types":"task.*"}}`))
	if resp.StatusCode != 201 {
		t.Fatalf("expected 201, got %d", resp.StatusCode)
	}
	var created map[string]any
	json.NewDecoder(resp.Body).Decode(&created)
	resp.Body.Close()
	id := created["id"].(string)

	resp, _ = http.Get(base + "/subscriptions")
	var listed map[string]any
	json.NewDecoder(resp.Body).Decode(&listed)
	resp.Body.Close()
	if len(listed["subscriptions"].([]any)) != 1 {
		t.Fatal("expected 1 subscription")
	}

	svc.Publish(map[string]any{"aep_version": "0.1", "id": "evt_lp", "type": "task.submitted", "source": "t", "created_at": "2026-07-11T10:00:00Z", "payload": map[string]any{}})
	resp, _ = http.Get(base + "/subscriptions/" + id + "/events")
	var lp map[string]any
	json.NewDecoder(resp.Body).Decode(&lp)
	resp.Body.Close()
	if len(lp["events"].([]any)) != 1 {
		t.Fatalf("expected 1 event, got %v", lp["events"])
	}

	req, _ := http.NewRequest(http.MethodDelete, base+"/subscriptions/"+id, nil)
	resp, _ = http.DefaultClient.Do(req)
	resp.Body.Close()
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200 delete, got %d", resp.StatusCode)
	}

	resp, _ = http.Get(base + "/subscriptions/" + id)
	resp.Body.Close()
	if resp.StatusCode != 404 {
		t.Fatalf("expected 404, got %d", resp.StatusCode)
	}
}

func TestRuntimeSubscriptionSSE(t *testing.T) {
	port := freePort(t)
	svc := NewRuntimeService(subApiConfig(port))
	svc.Start()
	defer svc.Stop()
	time.Sleep(200 * time.Millisecond)
	base := fmt.Sprintf("http://127.0.0.1:%d/aep/api", port)

	resp, _ := http.Post(base+"/subscriptions", "application/json", strings.NewReader(`{"filter":{"types":"task.*"}}`))
	var created map[string]any
	json.NewDecoder(resp.Body).Decode(&created)
	resp.Body.Close()
	id := created["id"].(string)

	streamResp, err := http.Get(base + "/subscriptions/" + id + "/stream")
	if err != nil {
		t.Fatalf("stream: %v", err)
	}
	defer streamResp.Body.Close()

	time.Sleep(100 * time.Millisecond)
	svc.Publish(map[string]any{"aep_version": "0.1", "id": "evt_sse", "type": "task.submitted", "source": "t", "created_at": "2026-07-11T10:00:00Z", "payload": map[string]any{}})

	reader := bufio.NewReader(streamResp.Body)
	done := make(chan string, 1)
	go func() {
		for {
			line, err := reader.ReadString('\n')
			if err != nil {
				return
			}
			if strings.HasPrefix(line, "data: ") {
				done <- line
				return
			}
		}
	}()
	select {
	case line := <-done:
		if !strings.Contains(line, "evt_sse") {
			t.Fatalf("expected evt_sse, got %s", line)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("timed out waiting for SSE event")
	}
	_ = io.Discard
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd implementations/go && go test ./aep/ -run TestRuntimeSubscription`
Expected: build failure, `CreateSubscription`/`TakeEvents` undefined.

- [ ] **Step 3: Add registry state to the service struct**

In `implementations/go/aep/runtime.go`, replace the `RuntimeService` struct and `subEntry` with registry support:

```go
type subEntry struct {
	pattern string
	handler func(event map[string]any)
}

type registryEntry struct {
	record map[string]any
	buffer []map[string]any
	sinks  map[chan map[string]any]bool
}

type RuntimeService struct {
	Config        RuntimeConfig
	store         DeliveryStore
	subs          []subEntry
	subscriptions map[string]*registryEntry
	maxBuffer     int
	ws            *WsBroadcastServer
	api           *http.Server
	apiPort       int
	mu            sync.Mutex
	started       bool
}
```

Update `NewRuntimeService`:

```go
func NewRuntimeService(c RuntimeConfig) *RuntimeService {
	store, _ := CreateDeliveryStore(c)
	return &RuntimeService{Config: c, store: store, subscriptions: make(map[string]*registryEntry), maxBuffer: 1000}
}
```

Add `"sync"` and `"github.com/google/uuid"` to the imports of `runtime.go`.

- [ ] **Step 4: Fan out in Publish**

In `Publish`, after the `s.subs` loop and before the `s.ws` broadcast, add registry fanout:

```go
	s.mu.Lock()
	for _, entry := range s.subscriptions {
		filter, _ := entry.record["filter"].(map[string]any)
		if SubscriptionMatches(filter, event) {
			entry.buffer = append(entry.buffer, event)
			if len(entry.buffer) > s.maxBuffer {
				entry.buffer = entry.buffer[1:]
			}
			for sink := range entry.sinks {
				select {
				case sink <- event:
				default:
				}
			}
		}
	}
	s.mu.Unlock()
```

- [ ] **Step 5: Load persisted subscriptions on start**

In `Start`, after the api branch and before `s.started = true`:

```go
	for _, record := range s.store.ListSubscriptions() {
		id, _ := record["id"].(string)
		s.subscriptions[id] = &registryEntry{record: record, sinks: make(map[chan map[string]any]bool)}
	}
```

- [ ] **Step 6: Add registry methods**

Add to `implementations/go/aep/runtime.go`:

```go
func (s *RuntimeService) CreateSubscription(filter map[string]any) map[string]any {
	if filter == nil {
		filter = map[string]any{}
	}
	record := map[string]any{
		"id":         "sub_" + uuid.NewString(),
		"filter":     filter,
		"created_at": now(),
	}
	s.store.CreateSubscription(record)
	s.mu.Lock()
	s.subscriptions[record["id"].(string)] = &registryEntry{record: record, sinks: make(map[chan map[string]any]bool)}
	s.mu.Unlock()
	return record
}

func (s *RuntimeService) ListSubscriptions() []map[string]any {
	s.mu.Lock()
	defer s.mu.Unlock()
	result := make([]map[string]any, 0, len(s.subscriptions))
	for _, entry := range s.subscriptions {
		result = append(result, entry.record)
	}
	return result
}

func (s *RuntimeService) GetSubscription(id string) map[string]any {
	s.mu.Lock()
	defer s.mu.Unlock()
	if entry, ok := s.subscriptions[id]; ok {
		return entry.record
	}
	return nil
}

func (s *RuntimeService) DeleteSubscription(id string) bool {
	s.mu.Lock()
	_, existed := s.subscriptions[id]
	delete(s.subscriptions, id)
	s.mu.Unlock()
	s.store.DeleteSubscription(id)
	return existed
}

func (s *RuntimeService) TakeEvents(id string, max int) []map[string]any {
	s.mu.Lock()
	defer s.mu.Unlock()
	entry, ok := s.subscriptions[id]
	if !ok {
		return []map[string]any{}
	}
	n := max
	if n > len(entry.buffer) {
		n = len(entry.buffer)
	}
	taken := entry.buffer[:n]
	entry.buffer = entry.buffer[n:]
	return taken
}

func (s *RuntimeService) AttachStream(id string) (chan map[string]any, func()) {
	s.mu.Lock()
	defer s.mu.Unlock()
	entry, ok := s.subscriptions[id]
	if !ok {
		return nil, nil
	}
	ch := make(chan map[string]any, 64)
	entry.sinks[ch] = true
	detach := func() {
		s.mu.Lock()
		delete(entry.sinks, ch)
		s.mu.Unlock()
	}
	return ch, detach
}
```

- [ ] **Step 7: Add subscription routes to handleAPI**

In `handleAPI`, add cases before the `default`:

```go
	case route == "/subscriptions" && r.Method == http.MethodPost:
		s.handleCreateSubscription(w, r)
	case route == "/subscriptions" && r.Method == http.MethodGet:
		sendJSON(w, 200, map[string]any{"subscriptions": s.ListSubscriptions()})
	case strings.HasPrefix(route, "/subscriptions/"):
		s.handleSubscriptionItem(route, w, r)
```

Add handler functions to `runtime.go`:

```go
func (s *RuntimeService) handleCreateSubscription(w http.ResponseWriter, r *http.Request) {
	raw, _ := io.ReadAll(r.Body)
	var body map[string]any
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &body); err != nil {
			sendJSON(w, 400, map[string]any{"error": "invalid JSON body"})
			return
		}
	} else {
		body = map[string]any{}
	}
	var filter map[string]any
	if f, ok := body["filter"].(map[string]any); ok {
		filter = f
	} else {
		filter = body
	}
	record := s.CreateSubscription(filter)
	sendJSON(w, 201, record)
}

func (s *RuntimeService) handleSubscriptionItem(route string, w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(route, "/subscriptions/")
	if strings.HasSuffix(rest, "/events") && r.Method == http.MethodGet {
		id := strings.TrimSuffix(rest, "/events")
		if s.GetSubscription(id) == nil {
			sendJSON(w, 404, map[string]any{"error": "not found"})
			return
		}
		sendJSON(w, 200, map[string]any{"events": s.TakeEvents(id, 100)})
		return
	}
	if strings.HasSuffix(rest, "/stream") && r.Method == http.MethodGet {
		id := strings.TrimSuffix(rest, "/stream")
		s.handleStream(id, w, r)
		return
	}
	if strings.Contains(rest, "/") {
		sendJSON(w, 404, map[string]any{"error": "not found"})
		return
	}
	switch r.Method {
	case http.MethodGet:
		record := s.GetSubscription(rest)
		if record == nil {
			sendJSON(w, 404, map[string]any{"error": "not found"})
			return
		}
		sendJSON(w, 200, record)
	case http.MethodDelete:
		if s.DeleteSubscription(rest) {
			sendJSON(w, 200, map[string]any{"deleted": true})
		} else {
			sendJSON(w, 404, map[string]any{"error": "not found"})
		}
	default:
		sendJSON(w, 404, map[string]any{"error": "not found"})
	}
}

func (s *RuntimeService) handleStream(id string, w http.ResponseWriter, r *http.Request) {
	if s.GetSubscription(id) == nil {
		sendJSON(w, 404, map[string]any{"error": "not found"})
		return
	}
	flusher, ok := w.(http.Flusher)
	if !ok {
		sendJSON(w, 500, map[string]any{"error": "streaming unsupported"})
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.WriteHeader(200)
	fmt.Fprint(w, ": ok\n\n")
	flusher.Flush()

	for _, evt := range s.TakeEvents(id, 1000) {
		writeSSE(w, flusher, evt)
	}
	ch, detach := s.AttachStream(id)
	if ch == nil {
		return
	}
	defer detach()
	for {
		select {
		case evt := <-ch:
			writeSSE(w, flusher, evt)
		case <-r.Context().Done():
			return
		}
	}
}

func writeSSE(w http.ResponseWriter, flusher http.Flusher, evt map[string]any) {
	data, _ := json.Marshal(evt)
	fmt.Fprintf(w, "data: %s\n\n", data)
	flusher.Flush()
}
```

- [ ] **Step 8: Run subscription tests**

Run: `cd implementations/go && go test ./aep/ -run TestRuntimeSubscription`
Expected: PASS.

- [ ] **Step 9: Run full aep package**

Run: `cd implementations/go && go test ./aep/`
Expected: PASS.

- [ ] **Step 10: Tidy modules and commit and push**

Run: `cd implementations/go && go mod tidy` (promotes `github.com/google/uuid` from indirect to direct).

```bash
git add implementations/go/aep/runtime.go implementations/go/aep/runtime_subscriptions_test.go implementations/go/go.mod implementations/go/go.sum
git commit -m "feat(go): add HTTP subscription registry, CRUD, long-poll, and SSE"
git push origin master
```

---

## Task 4: Final verification

- [ ] **Step 1: Run full Go suite**

Run: `cd implementations/go && go test ./...`
Expected: all packages pass.

- [ ] **Step 2: Build all binaries**

Run: `cd implementations/go && go build ./...`
Expected: no errors.

- [ ] **Step 3: Verify git sync**

Run: `git status -sb`
Expected: `## master...origin/master` with no changed files.
