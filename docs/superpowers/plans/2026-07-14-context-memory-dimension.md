# Context/Memory Dimension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract all `context.*` and `memory.*` event types from legacy registries into standalone Context/Memory dimension modules across TypeScript, Python, Go, and Java.

**Architecture:** Follow the established State dimension pattern — each language gets a self-contained Context/Memory module with a registry of 15 event types and an `isContextMemoryEventType` predicate. The legacy `aep` adapter module imports the new registry instead of hardcoding the types. The module depends only on Event public APIs (no dependency needed for string sets).

**Tech Stack:** TypeScript (Node 20, ESM, workspace packages), Python (3.12, setuptools), Go (1.25, standard lib), Java (21, Maven, JUnit 5)

---

### Task 1: TypeScript — Create `@axisrobo/harmovela-context` workspace package

**Files:**
- Create: `implementations/typescript/packages/context/package.json`
- Create: `implementations/typescript/packages/context/src/index.js`
- Create: `implementations/typescript/packages/context/test/context.test.js`
- Modify: `implementations/typescript/package.json`

- [ ] **Step 1: Create `packages/context/package.json`**

```json
{
  "name": "@axisrobo/harmovela-context",
  "version": "0.1.0-draft",
  "private": true,
  "type": "module",
  "main": "./src/index.js",
  "exports": {
    ".": "./src/index.js"
  },
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 2: Create `packages/context/src/index.js`**

```js
export const CONTEXT_MEMORY_EVENT_TYPES = new Set([
  "context.updated",
  "context.invalidated",
  "context.snapshot.requested",
  "context.snapshot.ready",
  "context.retrieval.started",
  "context.retrieval.completed",
  "context.retrieval.failed",
  "memory.fact.added",
  "memory.fact.updated",
  "memory.fact.invalidated",
  "memory.episode.stored",
  "memory.preference.updated",
  "memory.constraint.updated",
  "memory.summary.ready",
  "memory.retrieval.ready"
]);

export function isContextMemoryEventType(type) {
  return CONTEXT_MEMORY_EVENT_TYPES.has(type);
}
```

- [ ] **Step 3: Create `packages/context/test/context.test.js`**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { CONTEXT_MEMORY_EVENT_TYPES, isContextMemoryEventType } from "../src/index.js";

test("context/memory event types includes all 15 registry entries", () => {
  const expected = [
    "context.updated",
    "context.invalidated",
    "context.snapshot.requested",
    "context.snapshot.ready",
    "context.retrieval.started",
    "context.retrieval.completed",
    "context.retrieval.failed",
    "memory.fact.added",
    "memory.fact.updated",
    "memory.fact.invalidated",
    "memory.episode.stored",
    "memory.preference.updated",
    "memory.constraint.updated",
    "memory.summary.ready",
    "memory.retrieval.ready"
  ];
  for (const type of expected) {
    assert.equal(CONTEXT_MEMORY_EVENT_TYPES.has(type), true, `missing: ${type}`);
  }
  assert.equal(CONTEXT_MEMORY_EVENT_TYPES.size, expected.length);
});

test("isContextMemoryEventType positives", () => {
  assert.equal(isContextMemoryEventType("context.updated"), true);
  assert.equal(isContextMemoryEventType("context.invalidated"), true);
  assert.equal(isContextMemoryEventType("memory.fact.added"), true);
  assert.equal(isContextMemoryEventType("memory.retrieval.ready"), true);
});

test("isContextMemoryEventType negatives", () => {
  assert.equal(isContextMemoryEventType("task.submitted"), false);
  assert.equal(isContextMemoryEventType("session.opened"), false);
  assert.equal(isContextMemoryEventType("state.delta.applied"), false);
  assert.equal(isContextMemoryEventType(""), false);
});
```

- [ ] **Step 4: Add `"packages/context"` to the workspaces array in root `package.json`**

After line `"packages/task"` add `"packages/context"`.

- [ ] **Step 5: Run tests to verify**

Run: `cd implementations/typescript && node --test packages/context/test/context.test.js`
Expected: 3 tests pass.

- [ ] **Step 6: Commit TypeScript**

```bash
git add implementations/typescript/packages/context/ implementations/typescript/package.json
git commit -m "feat(typescript): add context/memory dimension module"
```

---

### Task 2: TypeScript — Update legacy adapter to import from context module

**Files:**
- Modify: `implementations/typescript/src/legacy-dimension-types.js`
- Modify: `implementations/typescript/src/index.js`

- [ ] **Step 1: Update `legacy-dimension-types.js` to import from context module**

Replace the hardcoded context.* and memory.* types with an import from `@axisrobo/harmovela-context` and spread it into the Set.

```js
import { CONTEXT_MEMORY_EVENT_TYPES } from "@axisrobo/harmovela-context";

const LEGACY_DIMENSION_EVENT_TYPES = new Set([
  "event.acknowledged",
  "event.rejected",
  "event.redelivered",
  "event.replayed",
  "event.dead_lettered",
  "tool.call.requested",
  "tool.call.accepted",
  "tool.call.rejected",
  "tool.call.started",
  "tool.call.progress",
  "tool.call.output",
  "tool.call.completed",
  "tool.call.failed",
  "tool.call.cancel.requested",
  "tool.call.cancelled",
  "tool.call.timed_out",
  "task.submitted",
  "task.accepted",
  "task.started",
  "task.blocked",
  "task.progress",
  "task.output",
  "task.completed",
  "task.failed",
  "task.cancel.requested",
  "task.cancelled",
  "task.timed_out",
  ...CONTEXT_MEMORY_EVENT_TYPES,
  "agent.message.sent",
  "agent.message.received",
  "agent.message.failed",
  "agent.request.created",
  "agent.response.created",
  "agent.decision.recorded",
  "environment.observed",
  "environment.changed",
  "environment.alerted",
  "environment.error",
  "belief.revised",
  "belief.conflict.detected",
  "freshness.expired",
  "freshness.window.changed",
  "delegation.requested",
  "delegation.accepted",
  "delegation.rejected",
  "delegation.handoff.completed",
  "delegation.escalated",
  "interruption.requested",
  "interruption.acknowledged",
  "interruption.saved",
  "interruption.resumed",
  "interruption.cancelled",
  "compensation.requested",
  "compensation.completed",
  "provenance.attestation.added",
  "provenance.attestation.revoked",
  "provenance.chain.truncated",
  "state.snapshot.requested",
  "state.snapshot.ready",
  "state.delta.applied",
  "state.invalidated"
]);
```

- [ ] **Step 2: Update `index.js` to export from context module**

Add an export for the context module:

```js
export { CONTEXT_MEMORY_EVENT_TYPES, isContextMemoryEventType } from "@axisrobo/harmovela-context";
```

- [ ] **Step 3: Run full test suite**

Run: `cd implementations/typescript && npm test`
Expected: All tests pass.

- [ ] **Step 4: Commit TypeScript legacy adapter update**

```bash
git add implementations/typescript/src/legacy-dimension-types.js implementations/typescript/src/index.js
git commit -m "feat(typescript): wire context/memory module into legacy adapter"
```

---

### Task 3: Python — Create `axisrobo_harmovela_context` package

**Files:**
- Create: `implementations/python/src/axisrobo_harmovela_context/__init__.py`

- [ ] **Step 1: Create `__init__.py`**

```python
CONTEXT_MEMORY_EVENT_TYPES = frozenset({
    "context.updated",
    "context.invalidated",
    "context.snapshot.requested",
    "context.snapshot.ready",
    "context.retrieval.started",
    "context.retrieval.completed",
    "context.retrieval.failed",
    "memory.fact.added",
    "memory.fact.updated",
    "memory.fact.invalidated",
    "memory.episode.stored",
    "memory.preference.updated",
    "memory.constraint.updated",
    "memory.summary.ready",
    "memory.retrieval.ready",
})


def is_context_memory_event_type(type_: str) -> bool:
    return type_ in CONTEXT_MEMORY_EVENT_TYPES


__all__ = ["CONTEXT_MEMORY_EVENT_TYPES", "is_context_memory_event_type"]
```

- [ ] **Step 2: Verify import works**

Run: `cd implementations/python && python -c "from axisrobo_harmovela_context import CONTEXT_MEMORY_EVENT_TYPES, is_context_memory_event_type; assert len(CONTEXT_MEMORY_EVENT_TYPES) == 15; assert is_context_memory_event_type('context.updated'); assert not is_context_memory_event_type('task.submitted'); print('OK')"`
Expected: OK

- [ ] **Step 3: Commit Python**

```bash
git add implementations/python/src/axisrobo_harmovela_context/
git commit -m "feat(python): add context/memory dimension module"
```

---

### Task 4: Python — Update legacy adapter to import from context module

**Files:**
- Modify: `implementations/python/src/aep/legacy_dimension_types.py`

- [ ] **Step 1: Update `legacy_dimension_types.py`**

Replace the hardcoded context.* and memory.* types with an import and set union:

```python
from axisrobo_harmovela_context import CONTEXT_MEMORY_EVENT_TYPES

LEGACY_DIMENSION_EVENT_TYPES = frozenset({
    "event.acknowledged", "event.rejected", "event.redelivered", "event.replayed", "event.dead_lettered",
    "tool.call.requested", "tool.call.accepted", "tool.call.rejected", "tool.call.started", "tool.call.progress",
    "tool.call.output", "tool.call.completed", "tool.call.failed", "tool.call.cancel.requested", "tool.call.cancelled",
    "tool.call.timed_out", "task.submitted", "task.accepted", "task.started", "task.blocked", "task.progress",
    "task.output", "task.completed", "task.failed", "task.cancel.requested", "task.cancelled", "task.timed_out",
    "agent.message.sent", "agent.message.received", "agent.message.failed", "agent.request.created", "agent.response.created",
    "agent.decision.recorded", "environment.observed", "environment.changed", "environment.alerted", "environment.error",
    "belief.revised", "belief.conflict.detected", "freshness.expired", "freshness.window.changed", "delegation.requested",
    "delegation.accepted", "delegation.rejected", "delegation.handoff.completed", "delegation.escalated", "interruption.requested",
    "interruption.acknowledged", "interruption.saved", "interruption.resumed", "interruption.cancelled", "compensation.requested",
    "compensation.completed", "provenance.attestation.added", "provenance.attestation.revoked", "provenance.chain.truncated",
    "state.snapshot.requested", "state.snapshot.ready", "state.delta.applied", "state.invalidated",
}.union(CONTEXT_MEMORY_EVENT_TYPES))
```

- [ ] **Step 2: Run Python tests**

Run: `cd implementations/python && python -m pytest tests/ -v`
Expected: All tests pass.

- [ ] **Step 3: Commit Python legacy adapter update**

```bash
git add implementations/python/src/aep/legacy_dimension_types.py
git commit -m "feat(python): wire context/memory module into legacy adapter"
```

---

### Task 5: Go — Create `context` package

**Files:**
- Create: `implementations/go/context/context.go`
- Create: `implementations/go/context/context_test.go`

- [ ] **Step 1: Create `context/context.go`**

```go
package context

var EventTypes = map[string]bool{
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
}

// IsEventType reports whether the type belongs to the Context/Memory dimension registry.
func IsEventType(typ string) bool {
	return EventTypes[typ]
}
```

- [ ] **Step 2: Create `context/context_test.go`**

```go
package context

import "testing"

func TestContextMemoryEventTypesIncludesAll15RegistryEntries(t *testing.T) {
	expected := []string{
		"context.updated",
		"context.invalidated",
		"context.snapshot.requested",
		"context.snapshot.ready",
		"context.retrieval.started",
		"context.retrieval.completed",
		"context.retrieval.failed",
		"memory.fact.added",
		"memory.fact.updated",
		"memory.fact.invalidated",
		"memory.episode.stored",
		"memory.preference.updated",
		"memory.constraint.updated",
		"memory.summary.ready",
		"memory.retrieval.ready",
	}
	for _, typ := range expected {
		if !EventTypes[typ] {
			t.Errorf("missing: %s", typ)
		}
	}
	if len(EventTypes) != len(expected) {
		t.Errorf("expected %d types, got %d", len(expected), len(EventTypes))
	}
}

func TestIsEventTypePositives(t *testing.T) {
	for _, typ := range []string{
		"context.updated",
		"context.invalidated",
		"memory.fact.added",
		"memory.retrieval.ready",
	} {
		if !IsEventType(typ) {
			t.Errorf("expected true for %s", typ)
		}
	}
}

func TestIsEventTypeNegatives(t *testing.T) {
	for _, typ := range []string{
		"task.submitted",
		"session.opened",
		"state.delta.applied",
		"",
	} {
		if IsEventType(typ) {
			t.Errorf("expected false for %s", typ)
		}
	}
}
```

- [ ] **Step 3: Run Go tests for context package**

Run: `cd implementations/go && go test ./context/ -v`
Expected: 3 tests pass.

- [ ] **Step 4: Commit Go**

```bash
git add implementations/go/context/
git commit -m "feat(go): add context/memory dimension module"
```

---

### Task 6: Go — Update legacy adapter to import from context module

**Files:**
- Modify: `implementations/go/aep/event_types.go`

- [ ] **Step 1: Update `aep/event_types.go`**

Add import for `context` and spread `context.EventTypes` into legacy map instead of hardcoding context.* and memory.* types.

```go
package aep

import (
	"github.com/axisrobo/harmovela/context"
	"github.com/axisrobo/harmovela/event"
)

var legacyStandardEventTypes = func() map[string]bool {
	m := map[string]bool{
		"event.redelivered":              true,
		"event.replayed":                 true,
		"event.dead_lettered":            true,
		"tool.call.requested":            true,
		"tool.call.accepted":             true,
		"tool.call.rejected":             true,
		"tool.call.started":              true,
		"tool.call.progress":             true,
		"tool.call.output":               true,
		"tool.call.completed":            true,
		"tool.call.failed":               true,
		"tool.call.cancel.requested":     true,
		"tool.call.cancelled":            true,
		"tool.call.timed_out":            true,
		"task.submitted":                 true,
		"task.accepted":                  true,
		"task.started":                   true,
		"task.blocked":                   true,
		"task.progress":                  true,
		"task.output":                    true,
		"task.completed":                 true,
		"task.failed":                    true,
		"task.cancel.requested":          true,
		"task.cancelled":                 true,
		"task.timed_out":                 true,
		"agent.message.sent":             true,
		"agent.message.received":         true,
		"agent.message.failed":           true,
		"agent.request.created":          true,
		"agent.response.created":         true,
		"agent.decision.recorded":        true,
		"environment.observed":           true,
		"environment.changed":            true,
		"environment.alerted":            true,
		"environment.error":              true,
		"belief.revised":                 true,
		"belief.conflict.detected":       true,
		"freshness.expired":              true,
		"freshness.window.changed":       true,
		"delegation.requested":           true,
		"delegation.accepted":            true,
		"delegation.rejected":            true,
		"delegation.handoff.completed":   true,
		"delegation.escalated":           true,
		"interruption.requested":         true,
		"interruption.acknowledged":      true,
		"interruption.saved":             true,
		"interruption.resumed":           true,
		"interruption.cancelled":         true,
		"compensation.requested":         true,
		"compensation.completed":         true,
		"provenance.attestation.added":   true,
		"provenance.attestation.revoked": true,
		"provenance.chain.truncated":     true,
		"state.snapshot.requested":       true,
		"state.snapshot.ready":           true,
		"state.delta.applied":            true,
		"state.invalidated":              true,
	}
	for k, v := range context.EventTypes {
		m[k] = v
	}
	return m
}()

// IsStandardEventType reports whether a type is supported by the legacy aep adapter.
func IsStandardEventType(typ string) bool {
	return event.IsStandardEventType(typ) || legacyStandardEventTypes[typ]
}
```

- [ ] **Step 2: Run full Go test suite**

Run: `cd implementations/go && go test ./... -v`
Expected: All tests pass.

- [ ] **Step 3: Commit Go legacy adapter update**

```bash
git add implementations/go/aep/event_types.go
git commit -m "feat(go): wire context/memory module into legacy adapter"
```

---

### Task 7: Java — Create `harmovela.context` package

**Files:**
- Create: `implementations/java/src/main/java/com/axisrobo/harmovela/context/ContextMemoryTypes.java`
- Create: `implementations/java/src/test/java/com/axisrobo/harmovela/context/ContextMemoryTypesTest.java`

- [ ] **Step 1: Create `ContextMemoryTypes.java`**

```java
package com.axisrobo.harmovela.context;

import java.util.Set;

public final class ContextMemoryTypes {
    private ContextMemoryTypes() {}

    public static final Set<String> EVENT_TYPES = Set.of(
        "context.updated",
        "context.invalidated",
        "context.snapshot.requested",
        "context.snapshot.ready",
        "context.retrieval.started",
        "context.retrieval.completed",
        "context.retrieval.failed",
        "memory.fact.added",
        "memory.fact.updated",
        "memory.fact.invalidated",
        "memory.episode.stored",
        "memory.preference.updated",
        "memory.constraint.updated",
        "memory.summary.ready",
        "memory.retrieval.ready"
    );

    public static boolean isContextMemoryEventType(String type) {
        return type != null && EVENT_TYPES.contains(type);
    }
}
```

- [ ] **Step 2: Create `ContextMemoryTypesTest.java`**

```java
package com.axisrobo.harmovela.context;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ContextMemoryTypesTest {
    @Test
    void includesAll15RegistryEntries() {
        assertEquals(15, ContextMemoryTypes.EVENT_TYPES.size());
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("context.updated"));
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("context.invalidated"));
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("context.snapshot.requested"));
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("context.snapshot.ready"));
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("context.retrieval.started"));
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("context.retrieval.completed"));
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("context.retrieval.failed"));
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("memory.fact.added"));
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("memory.fact.updated"));
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("memory.fact.invalidated"));
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("memory.episode.stored"));
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("memory.preference.updated"));
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("memory.constraint.updated"));
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("memory.summary.ready"));
        assertTrue(ContextMemoryTypes.EVENT_TYPES.contains("memory.retrieval.ready"));
    }

    @Test
    void isContextMemoryEventTypePositives() {
        assertTrue(ContextMemoryTypes.isContextMemoryEventType("context.updated"));
        assertTrue(ContextMemoryTypes.isContextMemoryEventType("context.invalidated"));
        assertTrue(ContextMemoryTypes.isContextMemoryEventType("memory.fact.added"));
        assertTrue(ContextMemoryTypes.isContextMemoryEventType("memory.retrieval.ready"));
    }

    @Test
    void isContextMemoryEventTypeNegatives() {
        assertFalse(ContextMemoryTypes.isContextMemoryEventType("task.submitted"));
        assertFalse(ContextMemoryTypes.isContextMemoryEventType("session.opened"));
        assertFalse(ContextMemoryTypes.isContextMemoryEventType("state.delta.applied"));
        assertFalse(ContextMemoryTypes.isContextMemoryEventType(""));
        assertFalse(ContextMemoryTypes.isContextMemoryEventType(null));
    }
}
```

- [ ] **Step 3: Run Java tests for context package**

Run: `cd implementations/java && mvn test -pl . -Dtest=com.axisrobo.harmovela.context.ContextMemoryTypesTest`
Expected: 3 tests pass.

- [ ] **Step 4: Commit Java**

```bash
git add implementations/java/src/main/java/com/axisrobo/harmovela/context/ implementations/java/src/test/java/com/axisrobo/harmovela/context/
git commit -m "feat(java): add context/memory dimension module"
```

---

### Task 8: Java — Update legacy adapter to import from context module

**Files:**
- Modify: `implementations/java/src/main/java/com/axisrobo/aep/EventTypes.java`

- [ ] **Step 1: Update `aep/EventTypes.java`**

Import `ContextMemoryTypes` and add its types to the `LEGACY_TYPES` set instead of hardcoding them:

```java
package com.axisrobo.aep;

import com.axisrobo.harmovela.context.ContextMemoryTypes;
import java.util.Set;
import java.util.HashSet;

public final class EventTypes {
    private EventTypes() {}

    private static final Set<String> LEGACY_TYPES;

    static {
        Set<String> types = new HashSet<>(Set.of(
            "event.redelivered", "event.replayed", "event.dead_lettered",
            "tool.call.requested", "tool.call.accepted", "tool.call.rejected", "tool.call.started",
            "tool.call.progress", "tool.call.output", "tool.call.completed", "tool.call.failed",
            "tool.call.cancel.requested", "tool.call.cancelled", "tool.call.timed_out",
            "task.submitted", "task.accepted", "task.started", "task.blocked", "task.progress",
            "task.output", "task.completed", "task.failed", "task.cancel.requested", "task.cancelled", "task.timed_out",
            "agent.message.sent", "agent.message.received", "agent.message.failed",
            "agent.request.created", "agent.response.created", "agent.decision.recorded",
            "environment.observed", "environment.changed", "environment.alerted", "environment.error",
            "belief.revised", "belief.conflict.detected",
            "freshness.expired", "freshness.window.changed",
            "delegation.requested", "delegation.accepted", "delegation.rejected",
            "delegation.handoff.completed", "delegation.escalated",
            "interruption.requested", "interruption.acknowledged", "interruption.saved",
            "interruption.resumed", "interruption.cancelled",
            "compensation.requested", "compensation.completed",
            "provenance.attestation.added", "provenance.attestation.revoked", "provenance.chain.truncated",
            "state.snapshot.requested", "state.snapshot.ready", "state.delta.applied", "state.invalidated"
        ));
        types.addAll(ContextMemoryTypes.EVENT_TYPES);
        LEGACY_TYPES = Set.copyOf(types);
    }

    public static boolean isStandardEventType(String type) {
        return type != null && (com.axisrobo.harmovela.event.registry.EventTypes.isStandardEventType(type)
            || LEGACY_TYPES.contains(type));
    }
}
```

- [ ] **Step 2: Run full Java test suite**

Run: `cd implementations/java && mvn test`
Expected: All tests pass.

- [ ] **Step 3: Commit Java legacy adapter update**

```bash
git add implementations/java/src/main/java/com/axisrobo/aep/EventTypes.java
git commit -m "feat(java): wire context/memory module into legacy adapter"
```
