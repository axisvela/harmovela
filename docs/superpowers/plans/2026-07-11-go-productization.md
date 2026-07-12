# Go Productization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Go reference a broadcast WebSocket server, a config loader, a runtime service, an `aepd` daemon, an `aep` CLI, and an HTTP read+ingest API, matching TypeScript core parity.

**Architecture:** A new broadcast `WsBroadcastServer` supports multiple clients and server-to-client push. A `MatchesType` helper is extracted for pattern matching. Delivery stores gain `GetDeadLettered`. A `runtime` package composes validation, router, delivery store, and the broadcast WS server, exposing publish with subscriber fanout. A stdlib `net/http` api server exposes health, ingest, dlq, pending, stats. Cobra-based `cmd/aep` and `cmd/aepd` binaries wrap the runtime.

**Tech Stack:** Go 1.25, `gorilla/websocket`, stdlib `net/http`, `spf13/cobra`, `go test`.

**Design reference:** `docs/superpowers/specs/2026-07-11-multi-language-productization-design.md`

---

## File Structure

- Create `implementations/go/aep/subscription.go`: `MatchesType(pattern, value)`.
- Modify `implementations/go/aep/delivery_store.go`, `delivery_sqlite.go`, `delivery_postgres.go`: add `GetDeadLettered` and interface method.
- Create `implementations/go/aep/transport_ws_broadcast.go`: broadcast WebSocket server.
- Create `implementations/go/aep/runtime.go`: config, `RuntimeService`, HTTP api server, daemon start.
- Create `implementations/go/cmd/aepd/main.go`: daemon binary.
- Create `implementations/go/cmd/aep/main.go`: CLI binary (cobra).
- Modify `implementations/go/go.mod`: add cobra.
- Create tests alongside.

---

## Task 1: MatchesType helper

**Files:**
- Create: `implementations/go/aep/subscription.go`
- Test: `implementations/go/aep/subscription_test.go`

- [ ] **Step 1: Write failing test**

Create `implementations/go/aep/subscription_test.go`:

```go
package aep

import "testing"

func TestMatchesType(t *testing.T) {
	cases := []struct {
		pattern string
		value   string
		want    bool
	}{
		{"*", "task.submitted", true},
		{"task.*", "task.submitted", true},
		{"task.*", "memory.updated", false},
		{"task.submitted", "task.submitted", true},
		{"task.submitted", "task.accepted", false},
		{"task.*.done", "task.build.done", true},
		{"task.*.done", "task.build.failed", false},
	}
	for _, c := range cases {
		if got := MatchesType(c.pattern, c.value); got != c.want {
			t.Fatalf("MatchesType(%q,%q)=%v want %v", c.pattern, c.value, got, c.want)
		}
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd implementations/go && go test ./aep/ -run TestMatchesType`
Expected: build failure, `MatchesType` undefined.

- [ ] **Step 3: Implement MatchesType**

Create `implementations/go/aep/subscription.go`:

```go
package aep

import "strings"

// MatchesType reports whether an event type matches a dotted subscription pattern.
// Supports "*" (any), a trailing ".*" prefix match, and per-segment "*" wildcards.
func MatchesType(pattern, value string) bool {
	if pattern == "*" || pattern == value {
		return true
	}
	if strings.HasSuffix(pattern, ".*") {
		prefix := pattern[:len(pattern)-1]
		return strings.HasPrefix(value, prefix)
	}
	patternParts := strings.Split(pattern, ".")
	valueParts := strings.Split(value, ".")
	if len(patternParts) != len(valueParts) {
		return false
	}
	for i, p := range patternParts {
		if p != "*" && p != valueParts[i] {
			return false
		}
	}
	return true
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd implementations/go && go test ./aep/ -run TestMatchesType`
Expected: PASS.

- [ ] **Step 5: Commit and push**

```bash
git add implementations/go/aep/subscription.go implementations/go/aep/subscription_test.go
git commit -m "feat(go): add MatchesType subscription helper"
git push origin master
```

---

## Task 2: Delivery stores GetDeadLettered

**Files:**
- Modify: `implementations/go/aep/delivery_store.go`
- Modify: `implementations/go/aep/delivery_sqlite.go`
- Modify: `implementations/go/aep/delivery_postgres.go`
- Test: `implementations/go/aep/delivery_store_test.go`

- [ ] **Step 1: Write failing test**

Append to `implementations/go/aep/delivery_store_test.go`:

```go
func TestInMemoryGetDeadLettered(t *testing.T) {
	store := NewInMemoryDeliveryStore(0, "stream_01")
	store.Track("evt_1", "sub_01")
	store.DeadLetter("evt_1", map[string]any{"error": map[string]any{"code": "timeout"}})
	records := store.GetDeadLettered()
	if len(records) != 1 {
		t.Fatalf("expected 1 record, got %d", len(records))
	}
	if records[0]["eventId"] != "evt_1" {
		t.Fatalf("expected evt_1, got %v", records[0]["eventId"])
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd implementations/go && go test ./aep/ -run TestInMemoryGetDeadLettered`
Expected: build failure, `GetDeadLettered` undefined.

- [ ] **Step 3: Add to the interface**

In `implementations/go/aep/delivery_store.go`, add to the `DeliveryStore` interface after `GetStats`:

```go
	GetDeadLettered() []map[string]any
```

- [ ] **Step 4: Implement in-memory GetDeadLettered**

In `implementations/go/aep/delivery_store.go`, add after `GetPendingForSubscription`:

```go
func (s *InMemoryDeliveryStore) GetDeadLettered() []map[string]any {
	result := make([]map[string]any, 0, len(s.deadLettered))
	for _, v := range s.deadLettered {
		result = append(result, map[string]any{
			"eventId":        v["eventId"],
			"subscriptionId": v["subscriptionId"],
			"reason":         v["reason"],
		})
	}
	return result
}
```

- [ ] **Step 5: Implement sqlite GetDeadLettered**

In `implementations/go/aep/delivery_sqlite.go`, add a method (near `GetPending`). Confirm the dead-letter table column names by reading the file first; the schema uses `event_id`, `subscription_id`, `reason`:

```go
func (s *SqliteDeliveryStore) GetDeadLettered() []map[string]any {
	rows, err := s.db.Query(`SELECT event_id, subscription_id, reason FROM delivery_dead_lettered ORDER BY sequence`)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var result []map[string]any
	for rows.Next() {
		var eventID, subscriptionID, reasonStr string
		if err := rows.Scan(&eventID, &subscriptionID, &reasonStr); err != nil {
			continue
		}
		var reason map[string]any
		json.Unmarshal([]byte(reasonStr), &reason)
		result = append(result, map[string]any{
			"eventId":        eventID,
			"subscriptionId": subscriptionID,
			"reason":         reason,
		})
	}
	return result
}
```

Ensure `encoding/json` is imported in `delivery_sqlite.go`; add it if missing. If the column for ordering is named `seq` rather than `sequence`, use the actual column name found in the file.

- [ ] **Step 6: Implement postgres GetDeadLettered**

In `implementations/go/aep/delivery_postgres.go`, add:

```go
func (s *PostgresDeliveryStore) GetDeadLettered() []map[string]any {
	rows, err := s.db.Query(fmt.Sprintf(`SELECT event_id, subscription_id, reason FROM %s ORDER BY seq`, s.t("dead_lettered")))
	if err != nil {
		return nil
	}
	defer rows.Close()
	var result []map[string]any
	for rows.Next() {
		var eventID, subscriptionID string
		var reasonBytes []byte
		if err := rows.Scan(&eventID, &subscriptionID, &reasonBytes); err != nil {
			continue
		}
		var reason map[string]any
		json.Unmarshal(reasonBytes, &reason)
		result = append(result, map[string]any{
			"eventId":        eventID,
			"subscriptionId": subscriptionID,
			"reason":         reason,
		})
	}
	return result
}
```

Ensure `encoding/json` and `fmt` are imported in `delivery_postgres.go`. Confirm the sequence column name and the `s.t(...)` helper by reading the file first; use the actual names.

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd implementations/go && go test ./aep/ -run "DeadLettered|Postgres"`
Expected: PASS.

- [ ] **Step 8: Commit and push**

```bash
git add implementations/go/aep/delivery_store.go implementations/go/aep/delivery_sqlite.go implementations/go/aep/delivery_postgres.go implementations/go/aep/delivery_store_test.go
git commit -m "feat(go): add GetDeadLettered to delivery stores"
git push origin master
```

---

## Task 3: Broadcast WebSocket server

**Files:**
- Create: `implementations/go/aep/transport_ws_broadcast.go`
- Test: `implementations/go/aep/transport_ws_broadcast_test.go`

- [ ] **Step 1: Write failing test**

Create `implementations/go/aep/transport_ws_broadcast_test.go`:

```go
package aep

import (
	"encoding/json"
	"fmt"
	"net"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

func freePort(t *testing.T) int {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer l.Close()
	return l.Addr().(*net.TCPAddr).Port
}

func TestWsBroadcastDeliversToClients(t *testing.T) {
	port := freePort(t)
	server := NewWsBroadcastServer("/aep")
	received := make(chan map[string]any, 1)
	server.OnMessage(func(event map[string]any) {
		received <- event
	})
	go server.Start(fmt.Sprintf("127.0.0.1:%d", port))
	defer server.Stop()
	time.Sleep(200 * time.Millisecond)

	url := fmt.Sprintf("ws://127.0.0.1:%d/aep", port)
	sub, _, err := websocket.DefaultDialer.Dial(url, nil)
	if err != nil {
		t.Fatalf("dial sub: %v", err)
	}
	defer sub.Close()
	time.Sleep(100 * time.Millisecond)

	server.Broadcast(map[string]any{"id": "evt_b", "type": "task.submitted"})

	sub.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, msg, err := sub.ReadMessage()
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	var event map[string]any
	json.Unmarshal(msg, &event)
	if event["id"] != "evt_b" {
		t.Fatalf("expected evt_b, got %v", event["id"])
	}
}

func TestWsBroadcastReceivesFromClient(t *testing.T) {
	port := freePort(t)
	server := NewWsBroadcastServer("/aep")
	received := make(chan map[string]any, 1)
	server.OnMessage(func(event map[string]any) {
		received <- event
	})
	go server.Start(fmt.Sprintf("127.0.0.1:%d", port))
	defer server.Stop()
	time.Sleep(200 * time.Millisecond)

	url := fmt.Sprintf("ws://127.0.0.1:%d/aep", port)
	client, _, err := websocket.DefaultDialer.Dial(url, nil)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	defer client.Close()
	client.WriteMessage(websocket.TextMessage, []byte(`{"id":"evt_in","type":"task.submitted"}`))

	select {
	case event := <-received:
		if event["id"] != "evt_in" {
			t.Fatalf("expected evt_in, got %v", event["id"])
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for inbound event")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd implementations/go && go test ./aep/ -run TestWsBroadcast`
Expected: build failure, `NewWsBroadcastServer` undefined.

- [ ] **Step 3: Implement the broadcast server**

Create `implementations/go/aep/transport_ws_broadcast.go`:

```go
package aep

import (
	"encoding/json"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

type WsBroadcastServer struct {
	path       string
	httpServer *http.Server
	clients    map[*websocket.Conn]bool
	onMessage  func(event map[string]any)
	mu         sync.RWMutex
}

func NewWsBroadcastServer(path string) *WsBroadcastServer {
	if path == "" {
		path = "/aep"
	}
	return &WsBroadcastServer{
		path:    path,
		clients: make(map[*websocket.Conn]bool),
	}
}

func (s *WsBroadcastServer) OnMessage(handler func(event map[string]any)) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.onMessage = handler
}

func (s *WsBroadcastServer) Start(addr string) error {
	mux := http.NewServeMux()
	mux.HandleFunc(s.path, s.handle)
	s.httpServer = &http.Server{Addr: addr, Handler: mux}
	err := s.httpServer.ListenAndServe()
	if err == http.ErrServerClosed {
		return nil
	}
	return err
}

func (s *WsBroadcastServer) Stop() {
	s.mu.Lock()
	for conn := range s.clients {
		conn.Close()
	}
	s.clients = make(map[*websocket.Conn]bool)
	s.mu.Unlock()
	if s.httpServer != nil {
		s.httpServer.Close()
	}
}

func (s *WsBroadcastServer) Broadcast(event map[string]any) {
	data, err := json.Marshal(event)
	if err != nil {
		return
	}
	s.mu.RLock()
	conns := make([]*websocket.Conn, 0, len(s.clients))
	for conn := range s.clients {
		conns = append(conns, conn)
	}
	s.mu.RUnlock()
	for _, conn := range conns {
		conn.WriteMessage(websocket.TextMessage, data)
	}
}

func (s *WsBroadcastServer) handle(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	s.mu.Lock()
	s.clients[conn] = true
	s.mu.Unlock()

	defer func() {
		s.mu.Lock()
		delete(s.clients, conn)
		s.mu.Unlock()
		conn.Close()
	}()

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			return
		}
		var event map[string]any
		if err := json.Unmarshal(message, &event); err != nil {
			continue
		}
		s.mu.RLock()
		handler := s.onMessage
		s.mu.RUnlock()
		if handler != nil {
			handler(event)
		}
	}
}
```

The existing `upgrader` var is defined in `transport_ws.go` in the same package and is reused here.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd implementations/go && go test ./aep/ -run TestWsBroadcast`
Expected: PASS.

- [ ] **Step 5: Commit and push**

```bash
git add implementations/go/aep/transport_ws_broadcast.go implementations/go/aep/transport_ws_broadcast_test.go
git commit -m "feat(go): add broadcast WebSocket server"
git push origin master
```

---

## Task 4: Runtime config, service, and HTTP api

**Files:**
- Create: `implementations/go/aep/runtime.go`
- Test: `implementations/go/aep/runtime_test.go`

- [ ] **Step 1: Write failing tests**

Create `implementations/go/aep/runtime_test.go`:

```go
package aep

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"
)

func memoryAPIConfig(port int) RuntimeConfig {
	c := DefaultConfig()
	c.Delivery.Store = "memory"
	c.Transports.WebSocket.Enabled = false
	c.Transports.SSE.Enabled = false
	c.Transports.API.Enabled = true
	c.Transports.API.Host = "127.0.0.1"
	c.Transports.API.Port = port
	return c
}

func TestDefaultConfig(t *testing.T) {
	c := DefaultConfig()
	if c.AepVersion != "0.1" {
		t.Fatalf("expected 0.1, got %s", c.AepVersion)
	}
	if c.Transports.API.Port != 8790 {
		t.Fatalf("expected 8790, got %d", c.Transports.API.Port)
	}
	if c.Delivery.Store != "sqlite" {
		t.Fatalf("expected sqlite, got %s", c.Delivery.Store)
	}
}

func TestRuntimePublishToSubscriber(t *testing.T) {
	c := DefaultConfig()
	c.Delivery.Store = "memory"
	c.Transports.WebSocket.Enabled = false
	c.Transports.SSE.Enabled = false
	c.Transports.API.Enabled = false
	svc := NewRuntimeService(c)
	seen := 0
	svc.Subscribe("task.*", func(event map[string]any) { seen++ })
	svc.Start()
	defer svc.Stop()
	if _, err := svc.Publish(map[string]any{
		"aep_version": "0.1", "id": "evt_a", "type": "task.submitted",
		"source": "t", "created_at": "2026-07-11T10:00:00Z", "payload": map[string]any{},
	}); err != nil {
		t.Fatalf("publish: %v", err)
	}
	if seen != 1 {
		t.Fatalf("expected 1, got %d", seen)
	}
}

func TestRuntimeRejectsInvalid(t *testing.T) {
	c := DefaultConfig()
	c.Delivery.Store = "memory"
	c.Transports.WebSocket.Enabled = false
	c.Transports.SSE.Enabled = false
	c.Transports.API.Enabled = false
	svc := NewRuntimeService(c)
	svc.Start()
	defer svc.Stop()
	if _, err := svc.Publish(map[string]any{"type": "task.submitted"}); err == nil {
		t.Fatal("expected error for invalid event")
	}
}

func TestRuntimeAPIEndpoints(t *testing.T) {
	port := freePort(t)
	svc := NewRuntimeService(memoryAPIConfig(port))
	svc.Start()
	defer svc.Stop()
	time.Sleep(200 * time.Millisecond)
	base := fmt.Sprintf("http://127.0.0.1:%d/aep/api", port)

	resp, err := http.Get(base + "/healthz")
	if err != nil {
		t.Fatalf("healthz: %v", err)
	}
	var health map[string]any
	json.NewDecoder(resp.Body).Decode(&health)
	resp.Body.Close()
	if health["status"] != "ok" {
		t.Fatalf("expected ok, got %v", health["status"])
	}

	body := `{"aep_version":"0.1","id":"evt_api","type":"task.submitted","source":"t","created_at":"2026-07-11T10:00:00Z","payload":{}}`
	resp, err = http.Post(base+"/events", "application/json", strings.NewReader(body))
	if err != nil {
		t.Fatalf("post events: %v", err)
	}
	if resp.StatusCode != 202 {
		t.Fatalf("expected 202, got %d", resp.StatusCode)
	}
	resp.Body.Close()

	resp, _ = http.Get(base + "/pending")
	var pending map[string]any
	json.NewDecoder(resp.Body).Decode(&pending)
	resp.Body.Close()
	if pending["pending"].(float64) != 1 {
		t.Fatalf("expected 1 pending, got %v", pending["pending"])
	}

	resp, _ = http.Post(base+"/events", "application/json", strings.NewReader(`{"type":"task.submitted"}`))
	if resp.StatusCode != 400 {
		t.Fatalf("expected 400, got %d", resp.StatusCode)
	}
	resp.Body.Close()

	resp, _ = http.Get(base + "/nope")
	if resp.StatusCode != 404 {
		t.Fatalf("expected 404, got %d", resp.StatusCode)
	}
	resp.Body.Close()

	_ = io.Discard
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd implementations/go && go test ./aep/ -run "TestDefaultConfig|TestRuntime"`
Expected: build failure, `DefaultConfig`/`NewRuntimeService` undefined.

- [ ] **Step 3: Implement runtime.go**

Create `implementations/go/aep/runtime.go`:

```go
package aep

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
)

type TransportConfig struct {
	Enabled bool   `json:"enabled"`
	Host    string `json:"host"`
	Port    int    `json:"port"`
	Path    string `json:"path"`
}

type DeliveryConfig struct {
	Store    string            `json:"store"`
	Sqlite   map[string]string `json:"sqlite"`
	Postgres map[string]string `json:"postgres"`
}

type RuntimeConfig struct {
	AepVersion string `json:"aep_version"`
	Runtime    struct {
		ID     string `json:"id"`
		Source string `json:"source"`
	} `json:"runtime"`
	Transports struct {
		WebSocket TransportConfig `json:"websocket"`
		SSE       TransportConfig `json:"sse"`
		API       TransportConfig `json:"api"`
		Stdio     TransportConfig `json:"stdio"`
	} `json:"transports"`
	Delivery DeliveryConfig `json:"delivery"`
}

func DefaultConfig() RuntimeConfig {
	var c RuntimeConfig
	c.AepVersion = "0.1"
	c.Runtime.ID = "aepd-local"
	c.Runtime.Source = "runtime:aepd"
	c.Transports.WebSocket = TransportConfig{Enabled: true, Host: "127.0.0.1", Port: 8787, Path: "/aep"}
	c.Transports.SSE = TransportConfig{Enabled: true, Host: "127.0.0.1", Port: 8788, Path: "/aep/events"}
	c.Transports.API = TransportConfig{Enabled: true, Host: "127.0.0.1", Port: 8790, Path: "/aep/api"}
	c.Transports.Stdio = TransportConfig{Enabled: false}
	c.Delivery = DeliveryConfig{
		Store:    "sqlite",
		Sqlite:   map[string]string{"path": ".aep/aep.sqlite"},
		Postgres: map[string]string{"url": "postgres://postgres:postgres@localhost:5433/postgres"},
	}
	return c
}

func WriteDefaultConfig(path string) error {
	data, err := json.MarshalIndent(DefaultConfig(), "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, append(data, '\n'), 0o644)
}

func LoadConfig(path string, env map[string]string) (RuntimeConfig, error) {
	if env == nil {
		env = envMap()
	}
	if path == "" {
		path = envOr(env, "AEP_CONFIG", "aep.config.json")
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		return RuntimeConfig{}, err
	}
	var c RuntimeConfig
	if err := json.Unmarshal(raw, &c); err != nil {
		return RuntimeConfig{}, err
	}
	return ApplyEnvOverrides(c, env), nil
}

func ApplyEnvOverrides(c RuntimeConfig, env map[string]string) RuntimeConfig {
	if v := env["AEPD_HOST"]; v != "" {
		c.Transports.WebSocket.Host = v
		c.Transports.SSE.Host = v
		c.Transports.API.Host = v
	}
	if v := env["AEPD_WS_PORT"]; v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			c.Transports.WebSocket.Port = n
		}
	}
	if v := env["AEPD_SSE_PORT"]; v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			c.Transports.SSE.Port = n
		}
	}
	if v := env["AEPD_API_PORT"]; v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			c.Transports.API.Port = n
		}
	}
	if v := env["AEP_POSTGRES_URL"]; v != "" {
		c.Delivery.Postgres["url"] = v
	}
	return c
}

func CreateDeliveryStore(c RuntimeConfig) (DeliveryStore, error) {
	switch c.Delivery.Store {
	case "memory":
		return NewInMemoryDeliveryStore(0, "stream_01"), nil
	case "sqlite":
		path := ":memory:"
		if c.Delivery.Sqlite != nil && c.Delivery.Sqlite["path"] != "" {
			path = c.Delivery.Sqlite["path"]
		}
		return NewSqliteDeliveryStore(path, "stream_01")
	case "postgres":
		url := ""
		if c.Delivery.Postgres != nil {
			url = c.Delivery.Postgres["url"]
		}
		return NewPostgresDeliveryStore(url, "stream_01", PostgresOptions{})
	}
	return nil, fmt.Errorf("unsupported delivery store: %s", c.Delivery.Store)
}

type subEntry struct {
	pattern string
	handler func(event map[string]any)
}

type RuntimeService struct {
	Config    RuntimeConfig
	store     DeliveryStore
	subs      []subEntry
	ws        *WsBroadcastServer
	api       *http.Server
	apiPort   int
	mu        sync.RWMutex
	started   bool
}

func NewRuntimeService(c RuntimeConfig) *RuntimeService {
	store, _ := CreateDeliveryStore(c)
	return &RuntimeService{Config: c, store: store}
}

func (s *RuntimeService) Subscribe(pattern string, handler func(event map[string]any)) {
	s.subs = append(s.subs, subEntry{pattern: pattern, handler: handler})
}

func (s *RuntimeService) Publish(event map[string]any) (map[string]any, error) {
	errs := ValidateEnvelope(event)
	if len(errs) > 0 {
		return nil, fmt.Errorf("invalid AEP event: %s", strings.Join(errs, "; "))
	}
	id, _ := event["id"].(string)
	sub, _ := event["subscription_id"].(string)
	if sub == "" {
		sub = "_runtime"
	}
	if s.store != nil {
		s.store.Track(id, sub)
	}
	typ, _ := event["type"].(string)
	for _, e := range s.subs {
		if MatchesType(e.pattern, typ) {
			e.handler(event)
		}
	}
	if s.ws != nil {
		s.ws.Broadcast(event)
	}
	return event, nil
}

func (s *RuntimeService) Start() error {
	if s.started {
		return nil
	}
	if s.Config.Transports.WebSocket.Enabled {
		ws := NewWsBroadcastServer(s.Config.Transports.WebSocket.Path)
		ws.OnMessage(func(event map[string]any) { s.Publish(event) })
		addr := fmt.Sprintf("%s:%d", s.Config.Transports.WebSocket.Host, s.Config.Transports.WebSocket.Port)
		go ws.Start(addr)
		s.ws = ws
	}
	if s.Config.Transports.API.Enabled {
		if err := s.startAPI(); err != nil {
			return err
		}
	}
	s.started = true
	return nil
}

func (s *RuntimeService) Stop() {
	if s.ws != nil {
		s.ws.Stop()
		s.ws = nil
	}
	if s.api != nil {
		s.api.Close()
		s.api = nil
	}
	if closer, ok := s.store.(interface{ Close() error }); ok {
		closer.Close()
	}
	s.started = false
}

func (s *RuntimeService) APIPort() int { return s.apiPort }

func (s *RuntimeService) startAPI() error {
	base := s.Config.Transports.API.Path
	if base == "" {
		base = "/aep/api"
	}
	mux := http.NewServeMux()
	mux.HandleFunc(base+"/", func(w http.ResponseWriter, r *http.Request) {
		route := strings.TrimPrefix(r.URL.Path, base)
		s.handleAPI(route, w, r)
	})
	mux.HandleFunc(base, func(w http.ResponseWriter, r *http.Request) {
		s.handleAPI(strings.TrimPrefix(r.URL.Path, base), w, r)
	})

	ln, err := netListen(fmt.Sprintf("%s:%d", s.Config.Transports.API.Host, s.Config.Transports.API.Port))
	if err != nil {
		return err
	}
	s.apiPort = ln.port
	s.api = &http.Server{Handler: mux}
	go s.api.Serve(ln.listener)
	return nil
}

func (s *RuntimeService) handleAPI(route string, w http.ResponseWriter, r *http.Request) {
	switch {
	case route == "/healthz" && r.Method == http.MethodGet:
		sendJSON(w, 200, map[string]any{
			"status":   "ok",
			"runtime":  s.Config.Runtime,
			"delivery": s.store.GetStats(),
		})
	case route == "/events" && r.Method == http.MethodPost:
		s.handleIngest(w, r)
	case route == "/dlq" && r.Method == http.MethodGet:
		records := s.store.GetDeadLettered()
		sendJSON(w, 200, map[string]any{"deadLettered": len(records), "records": records})
	case route == "/pending" && r.Method == http.MethodGet:
		records := s.store.GetPending()
		sendJSON(w, 200, map[string]any{"pending": len(records), "records": records})
	case route == "/stats" && r.Method == http.MethodGet:
		sendJSON(w, 200, s.store.GetStats())
	default:
		sendJSON(w, 404, map[string]any{"error": "not found"})
	}
}

func (s *RuntimeService) handleIngest(w http.ResponseWriter, r *http.Request) {
	raw, _ := io.ReadAll(r.Body)
	var event map[string]any
	if err := json.Unmarshal(raw, &event); err != nil {
		sendJSON(w, 400, map[string]any{"accepted": false, "errors": []string{"invalid JSON body"}})
		return
	}
	if errs := ValidateEnvelope(event); len(errs) > 0 {
		sendJSON(w, 400, map[string]any{"accepted": false, "errors": errs})
		return
	}
	s.Publish(event)
	sendJSON(w, 202, map[string]any{"accepted": true, "id": event["id"]})
}

func sendJSON(w http.ResponseWriter, status int, body map[string]any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(body)
}
```

This file references `os`, `netListen`, `envMap`, and `envOr`. Add these helpers:

Add to the imports of `runtime.go`: `"net"`, `"os"`.

Add helper functions at the end of `runtime.go`:

```go
type boundListener struct {
	listener net.Listener
	port     int
}

func netListen(addr string) (*boundListener, error) {
	l, err := net.Listen("tcp", addr)
	if err != nil {
		return nil, err
	}
	return &boundListener{listener: l, port: l.Addr().(*net.TCPAddr).Port}, nil
}

func envMap() map[string]string {
	m := make(map[string]string)
	for _, kv := range os.Environ() {
		parts := strings.SplitN(kv, "=", 2)
		if len(parts) == 2 {
			m[parts[0]] = parts[1]
		}
	}
	return m
}

func envOr(env map[string]string, key, fallback string) string {
	if v, ok := env[key]; ok && v != "" {
		return v
	}
	return fallback
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd implementations/go && go test ./aep/ -run "TestDefaultConfig|TestRuntime"`
Expected: PASS.

- [ ] **Step 5: Run the full aep package tests**

Run: `cd implementations/go && go test ./aep/`
Expected: PASS.

- [ ] **Step 6: Commit and push**

```bash
git add implementations/go/aep/runtime.go implementations/go/aep/runtime_test.go
git commit -m "feat(go): add runtime config, service, and HTTP api"
git push origin master
```

---

## Task 5: Daemon and CLI binaries

**Files:**
- Modify: `implementations/go/go.mod` (add cobra)
- Create: `implementations/go/cmd/aepd/main.go`
- Create: `implementations/go/cmd/aep/main.go`
- Test: `implementations/go/aep/cmd_e2e_test.go`

- [ ] **Step 1: Add cobra dependency**

Run: `cd implementations/go && go get github.com/spf13/cobra@latest`
Expected: `go.mod` gains cobra.

- [ ] **Step 2: Write failing e2e test**

Create `implementations/go/aep/cmd_e2e_test.go`:

```go
package aep

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"
)

func TestDaemonServiceHTTPRoundTrip(t *testing.T) {
	port := freePort(t)
	c := DefaultConfig()
	c.Delivery.Store = "memory"
	c.Transports.WebSocket.Enabled = false
	c.Transports.SSE.Enabled = false
	c.Transports.API.Enabled = true
	c.Transports.API.Host = "127.0.0.1"
	c.Transports.API.Port = port

	svc := NewRuntimeService(c)
	if err := svc.Start(); err != nil {
		t.Fatalf("start: %v", err)
	}
	defer svc.Stop()
	time.Sleep(200 * time.Millisecond)

	base := fmt.Sprintf("http://127.0.0.1:%d/aep/api", port)
	body := `{"aep_version":"0.1","id":"evt_daemon","type":"task.submitted","source":"t","created_at":"2026-07-11T10:00:00Z","payload":{}}`
	resp, err := http.Post(base+"/events", "application/json", strings.NewReader(body))
	if err != nil {
		t.Fatalf("post: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != 202 {
		t.Fatalf("expected 202, got %d", resp.StatusCode)
	}

	resp, _ = http.Get(base + "/pending")
	var pending map[string]any
	json.NewDecoder(resp.Body).Decode(&pending)
	resp.Body.Close()
	if pending["pending"].(float64) != 1 {
		t.Fatalf("expected 1 pending, got %v", pending["pending"])
	}
}
```

- [ ] **Step 3: Run test to verify it passes at the service level**

Run: `cd implementations/go && go test ./aep/ -run TestDaemonServiceHTTPRoundTrip`
Expected: PASS. This validates the daemon composition path before wiring binaries.

- [ ] **Step 4: Implement the daemon binary**

Create `implementations/go/cmd/aepd/main.go`:

```go
package main

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/axisrobo/aep/aep"
)

func main() {
	config, err := aep.LoadConfig(os.Getenv("AEP_CONFIG"), nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "aepd: %v\n", err)
		os.Exit(1)
	}
	svc := aep.NewRuntimeService(config)
	if err := svc.Start(); err != nil {
		fmt.Fprintf(os.Stderr, "aepd: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("aepd started api=%d\n", svc.APIPort())

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt, syscall.SIGTERM)
	<-sig
	svc.Stop()
}
```

- [ ] **Step 5: Implement the CLI binary**

Create `implementations/go/cmd/aep/main.go`:

```go
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/axisrobo/aep/aep"
	"github.com/gorilla/websocket"
	"github.com/spf13/cobra"
)

func main() {
	root := &cobra.Command{Use: "aep", Short: "Agent Event Protocol CLI"}

	var initConfig string
	initCmd := &cobra.Command{Use: "init", Short: "Create an AEP runtime config file", RunE: func(_ *cobra.Command, _ []string) error {
		if err := aep.WriteDefaultConfig(initConfig); err != nil {
			return err
		}
		fmt.Printf("created %s\n", initConfig)
		return nil
	}}
	initCmd.Flags().StringVar(&initConfig, "config", "aep.config.json", "config file path")

	var startConfig string
	startCmd := &cobra.Command{Use: "start", Short: "Start the local aepd runtime daemon", RunE: func(_ *cobra.Command, _ []string) error {
		config, err := aep.LoadConfig(startConfig, nil)
		if err != nil {
			return err
		}
		svc := aep.NewRuntimeService(config)
		if err := svc.Start(); err != nil {
			return err
		}
		fmt.Printf("aepd started api=%d\n", svc.APIPort())
		select {}
	}}
	startCmd.Flags().StringVar(&startConfig, "config", "aep.config.json", "config file path")

	var statusURL string
	statusCmd := &cobra.Command{Use: "status", Short: "Query an aepd health endpoint", RunE: func(_ *cobra.Command, _ []string) error {
		resp, err := http.Get(statusURL)
		if err != nil {
			return fmt.Errorf("status request failed: %w", err)
		}
		defer resp.Body.Close()
		body, _ := io.ReadAll(resp.Body)
		fmt.Println(string(body))
		return nil
	}}
	statusCmd.Flags().StringVar(&statusURL, "url", "http://127.0.0.1:8790/aep/api/healthz", "health endpoint URL")

	var emitPayload, emitURL, emitID, emitSource string
	emitCmd := &cobra.Command{Use: "emit <type>", Short: "Emit one AEP event over WebSocket", Args: cobra.ExactArgs(1), RunE: func(_ *cobra.Command, args []string) error {
		var payload map[string]any
		if err := json.Unmarshal([]byte(emitPayload), &payload); err != nil {
			return fmt.Errorf("invalid JSON payload")
		}
		id := emitID
		if id == "" {
			id = fmt.Sprintf("evt_%d", time.Now().UnixNano())
		}
		event := map[string]any{
			"aep_version": "0.1", "id": id, "type": args[0], "source": emitSource,
			"created_at": time.Now().UTC().Format(time.RFC3339), "payload": payload,
		}
		conn, _, err := websocket.DefaultDialer.Dial(emitURL, nil)
		if err != nil {
			return fmt.Errorf("emit: %w. Is aepd running?", err)
		}
		defer conn.Close()
		data, _ := json.Marshal(event)
		if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
			return err
		}
		fmt.Println(string(data))
		return nil
	}}
	emitCmd.Flags().StringVar(&emitPayload, "payload", "{}", "event payload JSON")
	emitCmd.Flags().StringVar(&emitURL, "url", "ws://127.0.0.1:8787/aep", "WebSocket URL")
	emitCmd.Flags().StringVar(&emitID, "id", "", "event id")
	emitCmd.Flags().StringVar(&emitSource, "source", "cli:aep", "event source")

	var subType, subURL string
	subscribeCmd := &cobra.Command{Use: "subscribe", Short: "Subscribe to AEP events over WebSocket", RunE: func(_ *cobra.Command, _ []string) error {
		conn, _, err := websocket.DefaultDialer.Dial(subURL, nil)
		if err != nil {
			return fmt.Errorf("subscribe: %w. Is aepd running?", err)
		}
		defer conn.Close()
		for {
			_, message, err := conn.ReadMessage()
			if err != nil {
				return nil
			}
			var event map[string]any
			if json.Unmarshal(message, &event) != nil {
				continue
			}
			typ, _ := event["type"].(string)
			if aep.MatchesType(subType, typ) {
				fmt.Println(string(message))
			}
		}
	}}
	subscribeCmd.Flags().StringVar(&subType, "type", "*", "event type pattern")
	subscribeCmd.Flags().StringVar(&subURL, "url", "ws://127.0.0.1:8787/aep", "WebSocket URL")

	var dlqConfig string
	dlqCmd := &cobra.Command{Use: "dlq [subcommand]", Short: "Inspect dead-lettered events", RunE: func(_ *cobra.Command, args []string) error {
		sub := "list"
		if len(args) > 0 {
			sub = args[0]
		}
		if sub != "list" {
			return fmt.Errorf("unsupported dlq command: %s", sub)
		}
		config, err := aep.LoadConfig(dlqConfig, nil)
		if err != nil {
			return err
		}
		store, err := aep.CreateDeliveryStore(config)
		if err != nil {
			return err
		}
		records := store.GetDeadLettered()
		stats := store.GetStats()
		out, _ := json.Marshal(map[string]any{"deadLettered": stats["deadLettered"], "records": records})
		fmt.Println(string(out))
		if closer, ok := store.(interface{ Close() error }); ok {
			closer.Close()
		}
		return nil
	}}
	dlqCmd.Flags().StringVar(&dlqConfig, "config", "aep.config.json", "config file path")

	root.AddCommand(initCmd, startCmd, statusCmd, emitCmd, subscribeCmd, dlqCmd)
	if err := root.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "aep: %v\n", err)
		os.Exit(1)
	}
}

var _ = strings.TrimSpace
```

Note: `aep conformance` in Go is provided by `go test ./aep/ -run Conformance`, so the CLI omits a conformance subcommand; the design's conformance command is optional for Go and covered by the test runner. The unused `strings` guard import line prevents an unused import if refactored; remove it if `strings` is otherwise used.

- [ ] **Step 6: Build binaries and run e2e**

Run: `cd implementations/go && go build ./...`
Expected: builds `cmd/aep` and `cmd/aepd` without errors.

Run: `cd implementations/go && go test ./aep/ -run TestDaemonServiceHTTPRoundTrip`
Expected: PASS.

- [ ] **Step 7: Commit and push**

```bash
git add implementations/go/go.mod implementations/go/go.sum implementations/go/cmd/aepd/main.go implementations/go/cmd/aep/main.go implementations/go/aep/cmd_e2e_test.go
git commit -m "feat(go): add aepd daemon and aep cobra CLI"
git push origin master
```

---

## Task 6: Final verification

- [ ] **Step 1: Run full Go suite**

Run: `cd implementations/go && go test ./...`
Expected: all packages pass.

- [ ] **Step 2: Build all binaries**

Run: `cd implementations/go && go build ./...`
Expected: no errors.

- [ ] **Step 3: Verify git sync**

Run: `git status -sb`
Expected: `## master...origin/master` with no changed files.
