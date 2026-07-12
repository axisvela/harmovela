# Go Reference Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a minimal Go reference implementation under `implementations/go/` that passes AEP-C0 and AEP-C1 conformance against the shared fixture manifest.

**Architecture:** One Go module (`github.com/axisrobo/aep`) with zero external dependencies. Six source files mirror the TypeScript reference structure: event types, errors, envelope validation, router, session, harness, and fixtures. Table-driven `go test` runs the shared conformance manifest.

**Tech Stack:** Go 1.21+, `encoding/json`, `testing`, `os`, `time`, standard library only.

---

## File Structure

- Create: `implementations/go/go.mod` â€?module path `github.com/axisrobo/aep`, Go 1.21.
- Create: `implementations/go/aep/event_types.go` â€?standard event type registry.
- Create: `implementations/go/aep/errors.go` â€?error code constants and payload builder.
- Create: `implementations/go/aep/envelope.go` â€?Validates raw envelope maps.
- Create: `implementations/go/aep/envelope_test.go` â€?unit tests for validation.
- Create: `implementations/go/aep/router.go` â€?event router with pattern matching.
- Create: `implementations/go/aep/router_test.go` â€?unit tests for dispatch.
- Create: `implementations/go/aep/session.go` â€?session state machine.
- Create: `implementations/go/aep/harness.go` â€?harness + task tracker, implements C1 behavior.
- Create: `implementations/go/aep/harness_test.go` â€?unit tests for harness (sub, task, session).
- Create: `implementations/go/aep/fixtures.go` â€?manifest and NDJSON loader.
- Create: `implementations/go/aep/conformance_test.go` â€?manifest-driven conformance tests.
- Modify: `implementations/go/README.md` â€?setup/test scope.
- Modify: `README.md` â€?Go reference status.
- Modify: `docs/roadmap.md` â€?optional Phase 3 note.

---

### Task 1: Module Setup, Event Types, And Error Model

**Files:**
- Create: `implementations/go/go.mod`
- Create: `implementations/go/aep/event_types.go`
- Create: `implementations/go/aep/errors.go`

- [ ] **Step 1: Initialize Go module**

Create `implementations/go/go.mod`:

```
module github.com/axisrobo/aep

go 1.21
```

- [ ] **Step 2: Add event type registry**

Create `implementations/go/aep/event_types.go`:

```go
package aep

var standardEventTypes = map[string]bool{
	"session.opened":              true,
	"session.ready":               true,
	"session.heartbeat":           true,
	"session.closed":              true,
	"session.error":               true,
	"capabilities.requested":      true,
	"capabilities.declared":       true,
	"capabilities.changed":        true,
	"subscription.requested":      true,
	"subscription.created":        true,
	"subscription.rejected":       true,
	"subscription.cancelled":      true,
	"subscription.expired":        true,
	"event.acknowledged":          true,
	"event.rejected":              true,
	"event.redelivered":           true,
	"event.replayed":              true,
	"event.dead_lettered":         true,
	"tool.call.requested":         true,
	"tool.call.accepted":          true,
	"tool.call.rejected":          true,
	"tool.call.started":           true,
	"tool.call.progress":          true,
	"tool.call.output":            true,
	"tool.call.completed":         true,
	"tool.call.failed":            true,
	"tool.call.cancel.requested":  true,
	"tool.call.cancelled":         true,
	"tool.call.timed_out":         true,
	"task.submitted":              true,
	"task.accepted":               true,
	"task.started":                true,
	"task.blocked":                true,
	"task.progress":               true,
	"task.output":                 true,
	"task.completed":              true,
	"task.failed":                 true,
	"task.cancel.requested":       true,
	"task.cancelled":              true,
	"task.timed_out":              true,
	"context.updated":             true,
	"context.invalidated":         true,
	"context.snapshot.requested":  true,
	"context.snapshot.ready":      true,
	"context.retrieval.started":   true,
	"context.retrieval.completed": true,
	"context.retrieval.failed":    true,
	"memory.fact.added":           true,
	"memory.fact.updated":         true,
	"memory.fact.invalidated":     true,
	"memory.episode.stored":       true,
	"memory.preference.updated":   true,
	"memory.constraint.updated":   true,
	"memory.summary.ready":        true,
	"memory.retrieval.ready":      true,
	"agent.message.sent":          true,
	"agent.message.received":      true,
	"agent.message.failed":        true,
	"agent.request.created":       true,
	"agent.response.created":      true,
	"agent.decision.recorded":     true,
	"environment.observed":        true,
	"environment.changed":         true,
	"environment.alerted":         true,
	"environment.error":           true,
}

func IsStandardEventType(typ string) bool {
	return standardEventTypes[typ]
}
```

- [ ] **Step 3: Add error model**

Create `implementations/go/aep/errors.go`:

```go
package aep

const (
	ErrorCodeProtocolError      = "protocol_error"
	ErrorCodeInvalidEnvelope    = "invalid_envelope"
	ErrorCodeInvalidEventType   = "invalid_event_type"
	ErrorCodeUnsupportedVersion = "unsupported_version"
	ErrorCodeUnauthorized       = "unauthorized"
	ErrorCodeSessionError       = "session_error"
	ErrorCodeSessionTimeout     = "session_timeout"
	ErrorCodeSessionClosed      = "session_closed"
	ErrorCodeSubscriptionError  = "subscription_error"
	ErrorCodeSubscriptionRejected = "subscription_rejected"
	ErrorCodeTaskError          = "task_error"
	ErrorCodeTaskTimeout        = "task_timeout"
	ErrorCodeTaskCancelled      = "task_cancelled"
	ErrorCodeToolError          = "tool_error"
	ErrorCodeToolTimeout        = "tool_timeout"
	ErrorCodeInternalError      = "internal_error"
)

func ErrorPayload(code, message string, retryable bool) map[string]any {
	return map[string]any{
		"code":      code,
		"message":   message,
		"retryable": retryable,
		"details":   map[string]any{},
	}
}
```

- [ ] **Step 4: Commit**

```bash
cd implementations/go
git add go.mod aep/event_types.go aep/errors.go
git commit -m "feat: add Go module with event types and error model"
```

Expected: commit succeeds.

---

### Task 2: Envelope Validation

**Files:**
- Create: `implementations/go/aep/envelope.go`
- Create: `implementations/go/aep/envelope_test.go`

- [ ] **Step 1: Write failing envelope tests**

Create `implementations/go/aep/envelope_test.go`:

```go
package aep

import (
	"slices"
	"testing"
)

func TestValidateEnvelopeAcceptsValid(t *testing.T) {
	event := map[string]any{
		"aep_version": "0.1",
		"id":          "evt_001",
		"type":        "task.submitted",
		"source":      "agent:test",
		"created_at":  "2026-07-09T10:00:00Z",
		"payload":     map[string]any{},
	}
	errs := ValidateEnvelope(event)
	if len(errs) != 0 {
		t.Fatalf("expected no errors, got %v", errs)
	}
}

func TestValidateEnvelopeRejectsMissingFields(t *testing.T) {
	event := map[string]any{}
	errs := ValidateEnvelope(event)
	if len(errs) == 0 {
		t.Fatal("expected errors for missing fields")
	}
}

func TestValidateEnvelopeRejectsUnknownType(t *testing.T) {
	event := map[string]any{
		"aep_version": "0.1",
		"id":          "evt_001",
		"type":        "not.a.real.type",
		"source":      "agent:test",
		"created_at":  "2026-07-09T10:00:00Z",
		"payload":     map[string]any{},
	}
	errs := ValidateEnvelope(event)
	if len(errs) == 0 {
		t.Fatal("expected error for unknown type")
	}
}

func TestValidateEnvelopeRejectsUnsupportedVersion(t *testing.T) {
	event := map[string]any{
		"aep_version": "99.9",
		"id":          "evt_001",
		"type":        "task.submitted",
		"source":      "agent:test",
		"created_at":  "2026-07-09T10:00:00Z",
		"payload":     map[string]any{},
	}
	errs := ValidateEnvelope(event)
	if len(errs) == 0 {
		t.Fatal("expected error for unsupported version")
	}
	hasVersion := slices.ContainsFunc(errs, func(s string) bool {
		return len(s) > 0 && (s[0:7] == "unsuppo" || s[0:4] == "aep_")
	})
	if !hasVersion {
		t.Logf("errors: %v", errs)
	}
}
```

Note: if `slices.ContainsFunc` is not available in Go 1.21, use a manual loop instead in the test.

- [ ] **Step 2: Run test to verify it fails**

```bash
cd implementations/go
go test ./aep/ -run TestValidateEnvelope -v
```

Expected: FAIL with undefined `ValidateEnvelope`.

- [ ] **Step 3: Add envelope validation**

Create `implementations/go/aep/envelope.go`:

```go
package aep

import (
	"time"
)

var deliveryModes = map[string]bool{
	"best_effort":   true,
	"at_least_once": true,
	"replayable":    true,
}

func ValidateEnvelope(value map[string]any) []string {
	var errors []string

	if value == nil {
		return []string{"event must be a JSON object"}
	}

	requireString(value, "aep_version", &errors)
	requireString(value, "id", &errors)
	requireString(value, "type", &errors)
	requireString(value, "source", &errors)
	requireString(value, "created_at", &errors)

	if _, ok := value["payload"]; !ok {
		errors = append(errors, "payload is required")
	}

	if typ, ok := value["type"].(string); ok && !IsStandardEventType(typ) {
		errors = append(errors, "type is not in the standard draft registry: "+typ)
	}

	if v, ok := value["aep_version"].(string); ok && v != "0.1" {
		errors = append(errors, "unsupported protocol version: "+v)
	}

	if ts, ok := value["created_at"].(string); ok {
		if _, err := time.Parse(time.RFC3339, ts); err != nil {
			errors = append(errors, "created_at must be an ISO-compatible timestamp")
		}
	}

	if delivery, ok := value["delivery"]; ok {
		validateDelivery(delivery, &errors)
	}

	if typ, _ := value["type"].(string); typ == "subscription.requested" {
		if payload, ok := value["payload"].(map[string]any); ok {
			validateSubscriptionPayload(payload, &errors)
		}
	}

	return errors
}

func requireString(value map[string]any, field string, errors *[]string) {
	s, ok := value[field].(string)
	if !ok || s == "" {
		*errors = append(*errors, field+" must be a non-empty string")
	}
}

func validateDelivery(delivery any, errors *[]string) {
	d, ok := delivery.(map[string]any)
	if !ok {
		*errors = append(*errors, "delivery must be an object when present")
		return
	}
	if mode, ok := d["mode"].(string); ok && !deliveryModes[mode] {
		*errors = append(*errors, "delivery.mode must be one of: best_effort, at_least_once, replayable")
	}
}

func validateSubscriptionPayload(payload map[string]any, errors *[]string) {
	if types, ok := payload["types"]; ok && !isStringOrSlice(types) {
		*errors = append(*errors, "subscription payload types must be a string or string array")
	}
	fields := []string{"source", "target", "topic", "session_id", "conversation_id", "task_id"}
	for _, f := range fields {
		if v, ok := payload[f]; ok && !isStringOrSlice(v) {
			*errors = append(*errors, "subscription payload "+f+" must be a string or string array")
		}
	}
}

func isStringOrSlice(v any) bool {
	if _, ok := v.(string); ok {
		return true
	}
	arr, ok := v.([]any)
	if !ok {
		return false
	}
	for _, item := range arr {
		if _, ok := item.(string); !ok {
			return false
		}
	}
	return true
}
```

- [ ] **Step 4: Run the envelope tests**

```bash
cd implementations/go
go test ./aep/ -run TestValidateEnvelope -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add implementations/go/aep/envelope.go implementations/go/aep/envelope_test.go
git commit -m "feat: add Go envelope validation"
```

Expected: commit succeeds.

---

### Task 3: Event Router

**Files:**
- Create: `implementations/go/aep/router.go`
- Create: `implementations/go/aep/router_test.go`

- [ ] **Step 1: Write failing router tests**

Create `implementations/go/aep/router_test.go`:

```go
package aep

import (
	"testing"
)

func TestRouterDispatchesToMatchingHandler(t *testing.T) {
	r := NewEventRouter()
	called := false
	r.On(func(event map[string]any) bool {
		typ, _ := event["type"].(string)
		return typ == "task.started"
	}, func(event map[string]any) any {
		called = true
		return map[string]any{"type": "event.acknowledged"}
	})

	results := r.Dispatch(map[string]any{"type": "task.started"})
	if !called {
		t.Fatal("handler was not called")
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
}

func TestRouterMatchAllHandler(t *testing.T) {
	r := NewEventRouter()
	count := 0
	r.OnAll(func(event map[string]any) any {
		count++
		return nil
	})

	r.Dispatch(map[string]any{"type": "task.started"})
	r.Dispatch(map[string]any{"type": "session.opened"})
	if count != 2 {
		t.Fatalf("expected 2 calls, got %d", count)
	}
}

func TestRouterCollectsMultipleResponses(t *testing.T) {
	r := NewEventRouter()
	r.OnAll(func(event map[string]any) any {
		return []map[string]any{
			{"type": "event.acknowledged"},
			{"type": "session.ready"},
		}
	})

	results := r.Dispatch(map[string]any{"type": "task.started"})
	if len(results) != 2 {
		t.Fatalf("expected 2 results, got %d", len(results))
	}
}

func TestRouterNoMatchReturnsEmpty(t *testing.T) {
	r := NewEventRouter()
	r.On(func(event map[string]any) bool {
		return false
	}, func(event map[string]any) any {
		return map[string]any{"type": "event.acknowledged"}
	})

	results := r.Dispatch(map[string]any{"type": "task.started"})
	if len(results) != 0 {
		t.Fatalf("expected 0 results, got %d", len(results))
	}
}
```

- [ ] **Step 2: Run router tests to verify they fail**

```bash
cd implementations/go
go test ./aep/ -run TestRouter -v
```

Expected: FAIL with undefined `NewEventRouter`.

- [ ] **Step 3: Add router implementation**

Create `implementations/go/aep/router.go`:

```go
package aep

type EventHandler func(event map[string]any) any
type MatchFunc func(event map[string]any) bool

type handlerEntry struct {
	match   MatchFunc
	handler EventHandler
}

type EventRouter struct {
	handlers []handlerEntry
}

func NewEventRouter() *EventRouter {
	return &EventRouter{}
}

func (r *EventRouter) On(match MatchFunc, handler EventHandler) *EventRouter {
	r.handlers = append(r.handlers, handlerEntry{match: match, handler: handler})
	return r
}

func (r *EventRouter) OnAll(handler EventHandler) *EventRouter {
	r.handlers = append(r.handlers, handlerEntry{
		match:   func(event map[string]any) bool { return true },
		handler: handler,
	})
	return r
}

func (r *EventRouter) Dispatch(event map[string]any) []map[string]any {
	var results []map[string]any
	for _, entry := range r.handlers {
		if entry.match(event) {
			response := entry.handler(event)
			if response == nil {
				continue
			}
			switch v := response.(type) {
			case []map[string]any:
				results = append(results, v...)
			case map[string]any:
				results = append(results, v)
			case []any:
				for _, item := range v {
					if m, ok := item.(map[string]any); ok {
						results = append(results, m)
					}
				}
			}
		}
	}
	return results
}
```

- [ ] **Step 4: Run router tests**

```bash
cd implementations/go
go test ./aep/ -run TestRouter -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add implementations/go/aep/router.go implementations/go/aep/router_test.go
git commit -m "feat: add Go event router"
```

Expected: commit succeeds.

---

### Task 4: Session And Harness

**Files:**
- Create: `implementations/go/aep/session.go`
- Create: `implementations/go/aep/harness.go`
- Create: `implementations/go/aep/harness_test.go`

- [ ] **Step 1: Write failing harness test for capabilities**

Create `implementations/go/aep/harness_test.go`:

```go
package aep

import (
	"testing"
)

func TestHarnessDeclaresCapabilities(t *testing.T) {
	h := NewHarness()
	event := map[string]any{
		"aep_version": "0.1",
		"id":          "evt_001",
		"type":        "capabilities.requested",
		"source":      "agent:test",
		"created_at":  "2026-07-09T10:00:00Z",
		"payload":     map[string]any{},
	}
	responses := h.Handle(event)
	if len(responses) == 0 {
		t.Fatal("expected response for capabilities.requested")
	}
	resp := responses[0]
	if resp["type"] != "capabilities.declared" {
		t.Fatalf("expected capabilities.declared, got %v", resp["type"])
	}
}

func TestHarnessCreatesSubscription(t *testing.T) {
	h := NewHarness()
	event := map[string]any{
		"aep_version": "0.1",
		"id":          "evt_001",
		"type":        "subscription.requested",
		"source":      "agent:test",
		"created_at":  "2026-07-09T10:00:00Z",
		"payload": map[string]any{
			"types": []any{"task.*"},
		},
	}
	responses := h.Handle(event)
	resp := responses[0]
	if resp["type"] != "subscription.created" {
		t.Fatalf("expected subscription.created, got %v", resp["type"])
	}
}

func TestHarnessRejectsSubscriptionWithNoFilter(t *testing.T) {
	h := NewHarness()
	event := map[string]any{
		"aep_version": "0.1",
		"id":          "evt_001",
		"type":        "subscription.requested",
		"source":      "agent:test",
		"created_at":  "2026-07-09T10:00:00Z",
		"payload":     map[string]any{},
	}
	responses := h.Handle(event)
	if len(responses) == 0 {
		t.Fatal("expected rejection response")
	}
	resp := responses[0]
	if resp["type"] != "subscription.rejected" {
		t.Fatalf("expected subscription.rejected, got %v", resp["type"])
	}
}

func TestHarnessSessionOpenAndClose(t *testing.T) {
	h := NewHarness()
	open := map[string]any{
		"aep_version": "0.1",
		"id":          "evt_sess_001",
		"type":        "session.opened",
		"source":      "agent:test",
		"created_at":  "2026-07-09T10:00:00Z",
		"payload": map[string]any{
			"session_id": "sess_01",
			"version":    "0.1",
		},
	}
	responses := h.Handle(open)
	if len(responses) < 2 {
		t.Fatalf("expected at least 2 responses (opened + ready), got %d", len(responses))
	}
	types := make([]string, len(responses))
	for i, r := range responses {
		types[i], _ = r["type"].(string)
	}
	hasOpened := false
	hasReady := false
	for _, typ := range types {
		if typ == "session.opened" {
			hasOpened = true
		}
		if typ == "session.ready" {
			hasReady = true
		}
	}
	if !hasOpened || !hasReady {
		t.Fatalf("expected session.opened and session.ready in %v", types)
	}

	close := map[string]any{
		"aep_version": "0.1",
		"id":          "evt_close_001",
		"type":        "session.closed",
		"source":      "agent:test",
		"created_at":  "2026-07-09T10:05:00Z",
		"payload": map[string]any{
			"session_id": "sess_01",
			"reason":     "done",
		},
	}
	responses = h.Handle(close)
	hasClosed := false
	for _, r := range responses {
		typ, _ := r["type"].(string)
		if typ == "session.closed" {
			hasClosed = true
		}
	}
	if !hasClosed {
		t.Fatal("expected session.closed response")
	}
}

func TestHarnessTaskLifecycle(t *testing.T) {
	h := NewHarness()
	submitted := map[string]any{
		"aep_version": "0.1",
		"id":          "evt_task_001",
		"type":        "task.submitted",
		"source":      "agent:test",
		"created_at":  "2026-07-09T10:00:00Z",
		"task_id":     "task_01",
		"payload": map[string]any{
			"task_id":     "task_01",
			"description": "crawl example.org",
		},
	}
	responses := h.Handle(submitted)
	resp := responses[0]
	if resp["type"] != "task.accepted" {
		t.Fatalf("expected task.accepted, got %v", resp["type"])
	}

	started := map[string]any{
		"aep_version": "0.1",
		"id":          "evt_task_002",
		"type":        "task.started",
		"source":      "tool:crawl",
		"created_at":  "2026-07-09T10:00:05Z",
		"task_id":     "task_01",
		"payload":     map[string]any{"task_id": "task_01", "state": "started"},
	}
	responses = h.Handle(started)
	hasAck := false
	for _, r := range responses {
		if typ, _ := r["type"].(string); typ == "event.acknowledged" {
			hasAck = true
		}
	}
	if !hasAck {
		t.Fatal("expected event.acknowledged for task.started")
	}

	completed := map[string]any{
		"aep_version": "0.1",
		"id":          "evt_task_005",
		"type":        "task.completed",
		"source":      "tool:crawl",
		"created_at":  "2026-07-09T10:01:00Z",
		"task_id":     "task_01",
		"payload":     map[string]any{"task_id": "task_01", "state": "completed", "result": "done"},
	}
	responses = h.Handle(completed)
	hasCompleted := false
	for _, r := range responses {
		if typ, _ := r["type"].(string); typ == "task.completed" {
			hasCompleted = true
		}
	}
	if !hasCompleted {
		t.Fatal("expected task.completed event")
	}
}

func TestHarnessTaskRejectsUnknownTask(t *testing.T) {
	h := NewHarness()
	event := map[string]any{
		"aep_version": "0.1",
		"id":          "evt_001",
		"type":        "task.progress",
		"source":      "tool:crawl",
		"created_at":  "2026-07-09T10:00:00Z",
		"task_id":     "task_unknown",
		"payload":     map[string]any{"message": "progress"},
	}
	responses := h.Handle(event)
	if len(responses) == 0 {
		t.Fatal("expected rejection for unknown task")
	}
	resp := responses[0]
	if resp["type"] != "event.rejected" {
		t.Fatalf("expected event.rejected, got %v", resp["type"])
	}
}
```

- [ ] **Step 2: Run harness tests to verify they fail**

```bash
cd implementations/go
go test ./aep/ -run TestHarness -v
```

Expected: FAIL with undefined `NewHarness`.

- [ ] **Step 3: Add session implementation**

Create `implementations/go/aep/session.go`:

```go
package aep

import (
	"errors"
	"time"
)

type SessionState string

const (
	StateCreated SessionState = "created"
	StateOpened  SessionState = "opened"
	StateReady   SessionState = "ready"
	StateClosed  SessionState = "closed"
	StateError   SessionState = "error"
)

var validTransitions = map[SessionState][]SessionState{
	StateCreated: {StateOpened, StateError, StateClosed},
	StateOpened:  {StateReady, StateError, StateClosed},
	StateReady:   {StateError, StateClosed},
	StateClosed:  {},
	StateError:   {},
}

type AepSession struct {
	ID        string
	Source    string
	Version   string
	State     SessionState
	eventID   int
	openedAt  string
	readyAt   string
}

func NewAepSession(id, source, version string) *AepSession {
	if id == "" {
		id = "sess_" + time.Now().Format("20060102T150405Z")
	}
	if source == "" {
		source = "aep:session"
	}
	if version == "" {
		version = "0.1"
	}
	return &AepSession{
		ID:      id,
		Source:  source,
		Version: version,
		State:   StateCreated,
	}
}

func (s *AepSession) nextEventID() string {
	s.eventID++
	return "evt_sess_" + padInt(s.eventID, 6)
}

func (s *AepSession) IsActive() bool {
	return s.State == StateOpened || s.State == StateReady
}

func (s *AepSession) IsOpen() bool {
	return s.State == StateOpened
}

func (s *AepSession) Opened() (map[string]any, error) {
	if s.State != StateCreated {
		return nil, errors.New("cannot open session in state " + string(s.State))
	}
	s.State = StateOpened
	s.openedAt = time.Now().UTC().Format(time.RFC3339)
	return map[string]any{
		"aep_version": s.Version,
		"id":          s.nextEventID(),
		"type":        "session.opened",
		"source":      s.Source,
		"session_id":  s.ID,
		"created_at":  s.openedAt,
		"payload": map[string]any{
			"session_id": s.ID,
			"version":    s.Version,
		},
	}, nil
}

func (s *AepSession) Ready(capabilities map[string]any) (map[string]any, error) {
	if s.State != StateOpened && s.State != StateCreated {
		return nil, errors.New("cannot mark session ready in state " + string(s.State))
	}
	if s.State == StateCreated {
		if _, err := s.Opened(); err != nil {
			return nil, err
		}
	}
	s.State = StateReady
	s.readyAt = time.Now().UTC().Format(time.RFC3339)
	return map[string]any{
		"aep_version": s.Version,
		"id":          s.nextEventID(),
		"type":        "session.ready",
		"source":      s.Source,
		"session_id":  s.ID,
		"created_at":  s.readyAt,
		"payload": map[string]any{
			"session_id":   s.ID,
			"capabilities": capabilities,
		},
	}, nil
}

func (s *AepSession) Close() (map[string]any, error) {
	if s.State == StateClosed {
		return nil, nil
	}
	s.State = StateClosed
	now := time.Now().UTC().Format(time.RFC3339)
	return map[string]any{
		"aep_version": s.Version,
		"id":          s.nextEventID(),
		"type":        "session.closed",
		"source":      s.Source,
		"session_id":  s.ID,
		"created_at":  now,
		"payload": map[string]any{
			"session_id": s.ID,
		},
	}, nil
}

func padInt(n, width int) string {
	s := ""
	for i := 0; i < width; i++ {
		s = string(rune('0'+n%10)) + s
		n = n / 10
	}
	return s
}
```

Note: the `padInt` helper is a simple left-padding function. If Go 1.21 lacks `fmt.Sprintf("%06d", n)` in the stdlib, use `fmt.Sprintf` instead.

- [ ] **Step 4: Add harness implementation**

Create `implementations/go/aep/harness.go`:

```go
package aep

import (
	"time"
)

type TaskState string

const (
	TaskSubmitted  TaskState = "submitted"
	TaskAccepted   TaskState = "accepted"
	TaskStarted    TaskState = "started"
	TaskProgress   TaskState = "progress"
	TaskBlocked    TaskState = "blocked"
	TaskOutput     TaskState = "output"
	TaskCompleted  TaskState = "completed"
	TaskFailed     TaskState = "failed"
	TaskCancelled  TaskState = "cancelled"
	TaskTimedOut   TaskState = "timed_out"
)

var taskEventToState = map[string]TaskState{
	"task.submitted": TaskSubmitted,
	"task.accepted":  TaskAccepted,
	"task.started":   TaskStarted,
	"task.progress":  TaskProgress,
	"task.blocked":   TaskBlocked,
	"task.output":    TaskOutput,
	"task.completed": TaskCompleted,
	"task.failed":    TaskFailed,
	"task.cancelled": TaskCancelled,
	"task.timed_out": TaskTimedOut,
}

var terminalTaskStates = map[TaskState]bool{
	TaskCompleted: true,
	TaskFailed:    true,
	TaskCancelled: true,
	TaskTimedOut:  true,
}

var taskTransitions = map[TaskState]map[TaskState]bool{
	TaskSubmitted: {TaskAccepted: true, TaskFailed: true, TaskCancelled: true, TaskTimedOut: true},
	TaskAccepted:  {TaskStarted: true, TaskFailed: true, TaskCancelled: true, TaskTimedOut: true},
	TaskStarted:   {TaskProgress: true, TaskOutput: true, TaskBlocked: true, TaskCompleted: true, TaskFailed: true, TaskCancelled: true, TaskTimedOut: true},
	TaskBlocked:   {TaskStarted: true, TaskProgress: true, TaskFailed: true, TaskCancelled: true, TaskTimedOut: true},
	TaskProgress:  {TaskProgress: true, TaskOutput: true, TaskBlocked: true, TaskCompleted: true, TaskFailed: true, TaskCancelled: true, TaskTimedOut: true},
	TaskOutput:    {TaskProgress: true, TaskOutput: true, TaskBlocked: true, TaskCompleted: true, TaskFailed: true, TaskCancelled: true, TaskTimedOut: true},
}

type TaskTracker struct {
	ID          string
	State       TaskState
	Source      string
	Description string
	eventID     int
}

func NewTaskTracker(id, source, description string) *TaskTracker {
	return &TaskTracker{
		ID:          id,
		State:       TaskSubmitted,
		Source:      source,
		Description: description,
	}
}

func (tk *TaskTracker) Accept() map[string]any {
	return tk.transition("task.accepted", nil)
}

func (tk *TaskTracker) IsTerminal() bool {
	return terminalTaskStates[tk.State]
}

func (tk *TaskTracker) transition(eventType string, payload map[string]any) map[string]any {
	nextState, ok := taskEventToState[eventType]
	if !ok {
		return nil
	}

	if nextState != tk.State {
		allowed, hasAllowed := taskTransitions[tk.State]
		if !hasAllowed || !allowed[nextState] {
			return nil
		}
	}

	tk.State = nextState
	if payload == nil {
		payload = map[string]any{}
	}
	payload["task_id"] = tk.ID
	payload["state"] = string(tk.State)

	tk.eventID++
	return map[string]any{
		"aep_version": "0.1",
		"id":          "evt_task_" + padInt(tk.eventID, 6),
		"type":        eventType,
		"source":      tk.Source,
		"task_id":     tk.ID,
		"created_at":  time.Now().UTC().Format(time.RFC3339),
		"payload":     payload,
	}
}

type Harness struct {
	Source        string
	sequence      int
	subscriptions map[string]map[string]any
	tasks         map[string]*TaskTracker
	router        *EventRouter
	session       *AepSession
}

func NewHarness() *Harness {
	h := &Harness{
		Source:        "harness:aep",
		subscriptions: make(map[string]map[string]any),
		tasks:         make(map[string]*TaskTracker),
		router:        NewEventRouter(),
	}
	h.setupRouter()
	return h
}

func (h *Harness) Session() *AepSession {
	return h.session
}

func (h *Harness) Subscriptions() map[string]map[string]any {
	return h.subscriptions
}

func (h *Harness) Tasks() map[string]*TaskTracker {
	return h.tasks
}

func (h *Harness) setupRouter() {
	h.router.
		On(func(event map[string]any) bool {
			typ, _ := event["type"].(string)
			return typ == "capabilities.requested"
		}, h.handleCapabilities).
		On(func(event map[string]any) bool {
			typ, _ := event["type"].(string)
			return typ == "subscription.requested"
		}, h.handleSubscriptionRequested).
		On(func(event map[string]any) bool {
			typ, _ := event["type"].(string)
			return typ == "subscription.cancelled"
		}, h.handleSubscriptionCancelled).
		On(func(event map[string]any) bool {
			typ, _ := event["type"].(string)
			return typ == "task.submitted"
		}, h.handleTaskSubmitted).
		On(func(event map[string]any) bool {
			typ, _ := event["type"].(string)
			return len(typ) > 5 && typ[:5] == "task." && typ != "task.submitted"
		}, h.handleTaskEvent).
		On(func(event map[string]any) bool {
			typ, _ := event["type"].(string)
			return typ == "session.opened"
		}, h.handleSessionOpened).
		On(func(event map[string]any) bool {
			typ, _ := event["type"].(string)
			return typ == "session.closed"
		}, h.handleSessionClosed)
}

func (h *Harness) Handle(value map[string]any) []map[string]any {
	errs := ValidateEnvelope(value)
	if len(errs) > 0 {
		return []map[string]any{h.newEvent("event.rejected", value, map[string]any{
			"errors": errs,
			"error":  ErrorPayload(ErrorCodeInvalidEnvelope, errs[0], false),
		})}
	}

	typ, _ := value["type"].(string)
	if !IsStandardEventType(typ) && (len(typ) < 8 || typ[:8] != "session.") {
		return []map[string]any{h.newEvent("event.rejected", value, map[string]any{
			"errors": []string{"type not in standard draft registry: " + typ},
			"error":  ErrorPayload(ErrorCodeInvalidEventType, "unknown event type: "+typ, false),
		})}
	}

	if v, _ := value["aep_version"].(string); v != "0.1" {
		return []map[string]any{h.newEvent("event.rejected", value, map[string]any{
			"errors": []string{"unsupported protocol version: " + v},
			"error":  ErrorPayload(ErrorCodeUnsupportedVersion, "unsupported version "+v, false),
		})}
	}

	routed := h.router.Dispatch(value)
	if len(routed) > 0 {
		return routed
	}

	return []map[string]any{h.newEvent("event.acknowledged", value, map[string]any{
		"acknowledged_event_id": value["id"],
	})}
}

func (h *Harness) handleCapabilities(event map[string]any) any {
	return h.newEvent("capabilities.declared", event, map[string]any{
		"protocol":       "aep",
		"aep_version":    "0.1",
		"transports":     []string{"stdio"},
		"delivery_modes": []string{"best_effort", "at_least_once", "replayable"},
		"features": []string{
			"envelope_validation", "event_type_registry", "subscription_matching",
			"session_lifecycle", "task_lifecycle", "error_model", "event_routing",
		},
	})
}

func (h *Harness) handleSubscriptionRequested(event map[string]any) any {
	payload, _ := event["payload"].(map[string]any)
	if payload == nil {
		payload = map[string]any{}
	}

	subID := "sub_" + padInt(h.nextSeq(), 4)

	hasFilter := payload["types"] != nil || payload["source"] != nil || payload["target"] != nil || payload["topic"] != nil
	if !hasFilter {
		return h.newEvent("subscription.rejected", event, map[string]any{
			"subscription_id": subID,
			"filter":          payload,
			"error":           ErrorPayload(ErrorCodeSubscriptionRejected, "subscription must include at least one filter criterion", false),
		})
	}

	h.subscriptions[subID] = map[string]any{
		"id":         subID,
		"filter":     payload,
		"created_at": time.Now().UTC().Format(time.RFC3339),
	}

	return h.newEvent("subscription.created", event, map[string]any{
		"subscription_id": subID,
		"filter":          payload,
	})
}

func (h *Harness) handleSubscriptionCancelled(event map[string]any) any {
	payload, _ := event["payload"].(map[string]any)
	if payload != nil {
		if subID, ok := payload["subscription_id"].(string); ok {
			delete(h.subscriptions, subID)
		}
	}
	return h.newEvent("event.acknowledged", event, map[string]any{
		"acknowledged_event_id": event["id"],
	})
}

func (h *Harness) handleTaskSubmitted(event map[string]any) any {
	taskID, _ := event["task_id"].(string)
	if taskID == "" {
		if payload, ok := event["payload"].(map[string]any); ok {
			taskID, _ = payload["task_id"].(string)
		}
	}
	if taskID == "" {
		taskID = "task_" + time.Now().Format("20060102T150405Z")
	}

	if _, exists := h.tasks[taskID]; exists {
		return h.newEvent("event.rejected", event, map[string]any{
			"error": ErrorPayload(ErrorCodeTaskError, "duplicate task id: "+taskID, false),
		})
	}

	description, _ := event["payload"].(map[string]any)["description"].(string)
	tracker := NewTaskTracker(taskID, event["source"].(string), description)
	tracker.Accept()
	h.tasks[taskID] = tracker

	return h.newEvent("task.accepted", event, map[string]any{
		"task_id": taskID,
		"status":  "accepted",
	})
}

func (h *Harness) handleTaskEvent(event map[string]any) any {
	taskID, _ := event["task_id"].(string)
	if taskID == "" {
		if payload, ok := event["payload"].(map[string]any); ok {
			taskID, _ = payload["task_id"].(string)
		}
	}
	if taskID == "" {
		return nil
	}

	tracker, ok := h.tasks[taskID]
	if !ok {
		return h.newEvent("event.rejected", event, map[string]any{
			"error": ErrorPayload(ErrorCodeTaskError, "unknown task: "+taskID, false),
		})
	}

	eventType, _ := event["type"].(string)
	payload, _ := event["payload"].(map[string]any)
	taskEvent := tracker.transition(eventType, payload)
	if taskEvent == nil {
		return h.newEvent("event.rejected", event, map[string]any{
			"error": ErrorPayload(ErrorCodeTaskError, "illegal task transition: "+string(tracker.State)+" for task "+taskID, false),
		})
	}

	responses := []map[string]any{
		h.newEvent("event.acknowledged", event, map[string]any{
			"acknowledged_event_id": event["id"],
		}),
		taskEvent,
	}

	if tracker.IsTerminal() {
		delete(h.tasks, taskID)
	}

	return responses
}

func (h *Harness) handleSessionOpened(event map[string]any) any {
	if h.session != nil && h.session.IsActive() {
		return h.newEvent("event.rejected", event, map[string]any{
			"error": ErrorPayload(ErrorCodeSessionError, "session already active", false),
		})
	}

	sessionID, _ := event["session_id"].(string)
	h.session = NewAepSession(sessionID, h.Source, "0.1")
	opened, _ := h.session.Opened()

	ready, _ := h.session.Ready(map[string]any{
		"protocol":    "aep",
		"aep_version": "0.1",
		"transports":  []string{"stdio"},
		"features":    []string{"envelope", "subscription", "task_lifecycle", "error_model"},
	})

	return []map[string]any{opened, ready}
}

func (h *Harness) handleSessionClosed(event map[string]any) any {
	responses := []map[string]any{
		h.newEvent("event.acknowledged", event, map[string]any{
			"acknowledged_event_id": event["id"],
		}),
	}
	if h.session != nil && h.session.IsOpen() {
		closed, err := h.session.Close()
		if err == nil && closed != nil {
			responses = append(responses, closed)
		}
	}
	return responses
}

func (h *Harness) nextSeq() int {
	h.sequence++
	return h.sequence
}

func (h *Harness) newEvent(typ string, input map[string]any, payload map[string]any) map[string]any {
	seq := h.nextSeq()
	aepVer, _ := input["aep_version"].(string)
	if aepVer == "" {
		aepVer = "0.1"
	}
	source, _ := input["source"].(string)

	return map[string]any{
		"aep_version":    aepVer,
		"id":             "evt_harness_" + padInt(seq, 6),
		"type":           typ,
		"source":         h.Source,
		"target":         source,
		"topic":          input["topic"],
		"session_id":     input["session_id"],
		"conversation_id": input["conversation_id"],
		"task_id":        input["task_id"],
		"correlation_id": input["correlation_id"],
		"causation_id":   input["id"],
		"created_at":     time.Now().UTC().Format(time.RFC3339),
		"delivery": map[string]any{
			"mode":     "best_effort",
			"sequence": seq,
		},
		"payload": payload,
	}
}
```

- [ ] **Step 5: Run harness tests**

```bash
cd implementations/go
go test ./aep/ -run TestHarness -v
```

Expected: PASS, all 6 harness tests pass.

- [ ] **Step 6: Run all Go tests**

```bash
cd implementations/go
go test ./aep/ -v
```

Expected: PASS for all test files.

- [ ] **Step 7: Commit**

```bash
git add implementations/go/aep/session.go implementations/go/aep/harness.go implementations/go/aep/harness_test.go
git commit -m "feat: add Go session and harness"
```

Expected: commit succeeds.

---

### Task 5: Fixture Loading And Conformance Tests

**Files:**
- Create: `implementations/go/aep/fixtures.go`
- Create: `implementations/go/aep/conformance_test.go`

- [ ] **Step 1: Add fixture loading module**

Create `implementations/go/aep/fixtures.go`:

```go
package aep

import (
	"encoding/json"
	"os"
	"strings"
)

type ManifestFixture struct {
	Path          string   `json:"path"`
	Level         string   `json:"level"`
	Description   string   `json:"description"`
	Expectation   string   `json:"expectation"`
	Tags          []string `json:"tags"`
	ExpectedTypes []string `json:"expected_types"`
}

type Manifest struct {
	AEPVersion         string           `json:"aep_version"`
	DefaultTargetLevel string           `json:"default_target_level"`
	Levels             []string         `json:"levels"`
	Fixtures           []ManifestFixture `json:"fixtures"`
}

func LoadManifest(path string) (*Manifest, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var manifest Manifest
	if err := json.Unmarshal(data, &manifest); err != nil {
		return nil, err
	}
	return &manifest, nil
}

func LoadFixture(path string) ([]map[string]any, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	lines := strings.Split(strings.TrimSpace(string(data)), "\n")
	var events []map[string]any
	for _, line := range lines {
		if line == "" {
			continue
		}
		var event map[string]any
		if err := json.Unmarshal([]byte(line), &event); err != nil {
			return nil, err
		}
		events = append(events, event)
	}
	return events, nil
}
```

- [ ] **Step 2: Add conformance test**

Create `implementations/go/aep/conformance_test.go`:

```go
package aep

import (
	"path/filepath"
	"reflect"
	"testing"
)

var levelOrder = map[string]int{
	"AEP-C0": 0,
	"AEP-C1": 1,
	"AEP-C2": 2,
}

func TestConformanceManifestDeclaresKnownDraftLevels(t *testing.T) {
	manifest, err := LoadManifest("../../conformance/manifest.json")
	if err != nil {
		t.Fatalf("failed to load manifest: %v", err)
	}
	expectedLevels := []string{"AEP-C0", "AEP-C1", "AEP-C2"}
	if !reflect.DeepEqual(manifest.Levels, expectedLevels) {
		t.Fatalf("expected levels %v, got %v", expectedLevels, manifest.Levels)
	}
	if manifest.DefaultTargetLevel != "AEP-C1" {
		t.Fatalf("expected default target AEP-C1, got %v", manifest.DefaultTargetLevel)
	}
}

func TestConformanceFixtures(t *testing.T) {
	manifest, err := LoadManifest("../../conformance/manifest.json")
	if err != nil {
		t.Fatalf("failed to load manifest: %v", err)
	}

	targetLevelOrder, ok := levelOrder[manifest.DefaultTargetLevel]
	if !ok {
		targetLevelOrder = levelOrder["AEP-C1"]
	}

	for _, fixture := range manifest.Fixtures {
		fixtureLevelOrder, ok := levelOrder[fixture.Level]
		if !ok || fixtureLevelOrder > targetLevelOrder {
			t.Logf("SKIP %s %s (above target %s)", fixture.Level, fixture.Path, manifest.DefaultTargetLevel)
			continue
		}

		t.Run(fixture.Level+" "+fixture.Path, func(t *testing.T) {
			absPath := filepath.Join("../../conformance", fixture.Path)
			events, err := LoadFixture(absPath)
			if err != nil {
				t.Fatalf("failed to load fixture: %v", err)
			}

			types := make([]string, len(events))
			for i, event := range events {
				types[i], _ = event["type"].(string)
			}
			if !reflect.DeepEqual(types, fixture.ExpectedTypes) {
				t.Fatalf("expected types %v, got %v", fixture.ExpectedTypes, types)
			}

			for i, event := range events {
				errs := ValidateEnvelope(event)
				if len(errs) > 0 {
					t.Fatalf("event %d envelope validation: %v", i, errs)
				}
			}

			if fixture.Expectation == "stateful_flow" {
				harness := NewHarness()
				for i, event := range events {
					responses := harness.Handle(event)
					for _, resp := range responses {
						if typ, _ := resp["type"].(string); typ == "event.rejected" {
							errMsg := "unknown"
							if payload, ok := resp["payload"].(map[string]any); ok {
								if errObj, ok := payload["error"].(map[string]any); ok {
									errMsg, _ = errObj["message"].(string)
								}
							}
							t.Fatalf("event %d rejected: %s", i, errMsg)
						}
					}
				}
			}
		})
	}
}
```

- [ ] **Step 3: Run conformance tests**

```bash
cd implementations/go
go test ./aep/ -run TestConformance -v
```

Expected: PASS for manifest declaration, C0/C1 fixtures PASS, C2 delivery fixture SKIP.

- [ ] **Step 4: Run all Go tests**

```bash
cd implementations/go
go test ./aep/ -v
```

Expected: all tests pass (envelope, router, harness, conformance).

- [ ] **Step 5: Commit**

```bash
git add implementations/go/aep/fixtures.go implementations/go/aep/conformance_test.go
git commit -m "feat: add Go conformance tests"
```

Expected: commit succeeds.

---

### Task 6: Documentation, Verification, And Push

**Files:**
- Modify: `implementations/go/README.md`
- Modify: `README.md`

- [ ] **Step 1: Update Go README**

Replace `implementations/go/README.md` with:

```markdown
# AEP Go Reference

Go reference implementation of the Agent Event Protocol draft.

## Setup

```sh
cd implementations/go
```

No external dependencies. Requires Go 1.21+.

## Run Tests

```sh
go test ./aep/ -v
```

Conformance tests consume the shared manifest and fixtures from `../../conformance/`.

## Current Scope

- Typed envelope and field-level validation
- Standard draft event type registry
- Standard error model with typed error codes
- Event router with pattern-matching dispatch
- Session lifecycle state machine (opened, ready, closed, error)
- Task lifecycle tracking with valid state transitions
- Subscription create and cancel
- Manifest-driven C0 and C1 conformance tests
- Shared fixture integration from `../../conformance/fixtures/`
```

- [ ] **Step 2: Update root README Go status**

In `README.md`, replace the Go line under Repository Layout:

```markdown
- `implementations/go/` â€?planned infrastructure-oriented reference implementation
```

with:

```markdown
- `implementations/go/` â€?draft reference implementation with C0/C1 conformance
```

- [ ] **Step 3: Run full TypeScript and Python verification alongside Go**

```bash
cd implementations/go && go test ./aep/ -v
cd implementations/typescript && npm test
cd implementations/typescript && npm run conformance
cd implementations/python && python -m pytest --tb=short -q
```

Expected: all pass. Go: conformance tests pass. TypeScript: 80 tests, conformance C1 pass. Python: 48 tests.

- [ ] **Step 4: Commit and push**

```bash
git add implementations/go/README.md README.md
git commit -m "docs: update Go reference status"
git status --short
git log --oneline -5
git push
```

Expected: working tree clean, push succeeds over SSH.

---

## Self-Review Notes

- Spec coverage: Task 1 covers module, event types, errors. Task 2 covers envelope validation. Task 3 covers router. Task 4 covers session and harness (C1 behavior). Task 5 covers fixture loading and manifest-driven conformance. Task 6 covers docs, verification, and push.
- Scope: no transports, no delivery tracker, no JSON Schema validation, no goroutines. Matches design spec exactly.
- Placeholder scan: no TBD/TODO/fill-in markers remain.
- Type consistency: `map[string]any` used throughout for envelope data. `AepSession`, `Harness`, `EventRouter`, `TaskTracker` names match design spec. `LoadManifest`, `LoadFixture`, `ValidateEnvelope` signatures match design spec.
