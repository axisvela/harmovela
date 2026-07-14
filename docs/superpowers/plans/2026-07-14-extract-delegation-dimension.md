# Extract Delegation Dimension Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the Delegation dimension event types from legacy registries into independent Delegation dimension modules across TypeScript, Python, Go, and Java.

**Architecture:** Each language gets a self-contained Delegation dimension module (`@axisrobo/harmovela-delegation`, `axisrobo_harmovela_delegation`, `github.com/axisrobo/harmovela/delegation`, `com.axisrobo.harmovela.delegation`) that exports a set of delegation event types and a helper function. Legacy registries import from the new module. Four commits, one per language.

**Tech Stack:** Node.js 20+/ESM (TypeScript), Python 3.12+ (pytest), Go 1.25+, Java 21 (JUnit 5, Maven)

**Delegation event types extracted:**
- `delegation.requested`
- `delegation.accepted`
- `delegation.rejected`
- `delegation.handoff.completed`
- `delegation.escalated`

---

### Task 1: TypeScript Delegation Module

**Files:**
- Create: `implementations/typescript/packages/delegation/package.json`
- Create: `implementations/typescript/packages/delegation/src/index.js`
- Create: `implementations/typescript/packages/delegation/test/delegation.test.js`
- Modify: `implementations/typescript/src/legacy-dimension-types.js:1-69`
- Modify: `implementations/typescript/package.json:6-12` (workspaces array)

- [ ] **Step 1: Create package.json for delegation module**

```json
{
  "name": "@axisrobo/harmovela-delegation",
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

Write: `implementations/typescript/packages/delegation/package.json`

- [ ] **Step 2: Create delegation module source**

```js
export const DELEGATION_EVENT_TYPES = new Set([
  "delegation.requested",
  "delegation.accepted",
  "delegation.rejected",
  "delegation.handoff.completed",
  "delegation.escalated"
]);

export function isDelegationEventType(type) {
  return DELEGATION_EVENT_TYPES.has(type);
}
```

Write: `implementations/typescript/packages/delegation/src/index.js`

- [ ] **Step 3: Create delegation tests**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { DELEGATION_EVENT_TYPES, isDelegationEventType } from "../src/index.js";

test("delegation event types includes all 5 registry entries", () => {
  const expected = [
    "delegation.requested",
    "delegation.accepted",
    "delegation.rejected",
    "delegation.handoff.completed",
    "delegation.escalated"
  ];
  for (const type of expected) {
    assert.equal(DELEGATION_EVENT_TYPES.has(type), true, `missing: ${type}`);
  }
  assert.equal(DELEGATION_EVENT_TYPES.size, expected.length);
});

test("isDelegationEventType positives", () => {
  assert.equal(isDelegationEventType("delegation.requested"), true);
  assert.equal(isDelegationEventType("delegation.accepted"), true);
  assert.equal(isDelegationEventType("delegation.handoff.completed"), true);
  assert.equal(isDelegationEventType("delegation.escalated"), true);
});

test("isDelegationEventType negatives", () => {
  assert.equal(isDelegationEventType("task.submitted"), false);
  assert.equal(isDelegationEventType("session.opened"), false);
  assert.equal(isDelegationEventType("context.updated"), false);
  assert.equal(isDelegationEventType(""), false);
});
```

Write: `implementations/typescript/packages/delegation/test/delegation.test.js`

- [ ] **Step 4: Run delegation tests to verify they pass**

Run: `node --test implementations/typescript/packages/delegation/test/delegation.test.js`
Expected: all 3 tests PASS

- [ ] **Step 5: Update legacy-dimension-types.js to import from delegation module**

Read `implementations/typescript/src/legacy-dimension-types.js` first, then edit:

Add import at top (after existing context import):
```js
import { DELEGATION_EVENT_TYPES } from "@axisrobo/harmovela-delegation";
```

In the Spread the delegation event types into the Set:
Remove these 5 lines from the Set literal:
```
  "delegation.requested",
  "delegation.accepted",
  "delegation.rejected",
  "delegation.handoff.completed",
  "delegation.escalated",
```
And add `...DELEGATION_EVENT_TYPES,` after the `...CONTEXT_MEMORY_EVENT_TYPES,` line.

The final file should look like:
```js
import { CONTEXT_MEMORY_EVENT_TYPES } from "@axisrobo/harmovela-context";
import { DELEGATION_EVENT_TYPES } from "@axisrobo/harmovela-delegation";

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
  ...DELEGATION_EVENT_TYPES,
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

- [ ] **Step 6: Add delegation to workspace list in root package.json**

Edit `implementations/typescript/package.json`, add `"packages/delegation"` to the `workspaces` array:
```json
    "workspaces": [
    "packages/event",
    "packages/governance",
    "packages/recovery",
    "packages/task",
    "packages/context",
    "packages/delegation"
  ],
```

- [ ] **Step 7: Install workspace dependency**

Run: `npm install` in `implementations/typescript`
Expected: completes without errors, symlinks delegation package

- [ ] **Step 8: Run full TypeScript test suite to verify nothing is broken**

Run: `npm test` in `implementations/typescript`
Expected: all tests PASS

- [ ] **Step 9: Commit TypeScript changes**

```bash
git add implementations/typescript/packages/delegation/
git add implementations/typescript/src/legacy-dimension-types.js
git add implementations/typescript/package.json
git add implementations/typescript/package-lock.json
git commit -m "feat(typescript): extract delegation dimension module

Create @axisrobo/harmovela-delegation with 5 event types.
Register as adapter entry in legacy-dimension-types.js."
```

---

### Task 2: Python Delegation Module

**Files:**
- Create: `implementations/python/src/axisrobo_harmovela_delegation/__init__.py`
- Create: `implementations/python/tests/test_delegation_module.py`
- Modify: `implementations/python/src/aep/legacy_dimension_types.py:1-18`

- [ ] **Step 1: Create Python delegation module**

```python
DELEGATION_EVENT_TYPES = frozenset({
    "delegation.requested",
    "delegation.accepted",
    "delegation.rejected",
    "delegation.handoff.completed",
    "delegation.escalated",
})


def is_delegation_event_type(type_: str) -> bool:
    return type_ in DELEGATION_EVENT_TYPES


__all__ = ["DELEGATION_EVENT_TYPES", "is_delegation_event_type"]
```

Write: `implementations/python/src/axisrobo_harmovela_delegation/__init__.py`

- [ ] **Step 2: Create delegation tests**

```python
from axisrobo_harmovela_delegation import DELEGATION_EVENT_TYPES, is_delegation_event_type


def test_delegation_event_types_includes_all_5_registry_entries():
    expected = {
        "delegation.requested",
        "delegation.accepted",
        "delegation.rejected",
        "delegation.handoff.completed",
        "delegation.escalated",
    }
    assert DELEGATION_EVENT_TYPES == expected
    assert len(DELEGATION_EVENT_TYPES) == 5


def test_is_delegation_event_type_positives():
    assert is_delegation_event_type("delegation.requested") is True
    assert is_delegation_event_type("delegation.accepted") is True
    assert is_delegation_event_type("delegation.handoff.completed") is True
    assert is_delegation_event_type("delegation.escalated") is True


def test_is_delegation_event_type_negatives():
    assert is_delegation_event_type("task.submitted") is False
    assert is_delegation_event_type("session.opened") is False
    assert is_delegation_event_type("context.updated") is False
    assert is_delegation_event_type("") is False
```

Write: `implementations/python/tests/test_delegation_module.py`

- [ ] **Step 3: Run delegation tests to verify they pass**

Run: `pytest implementations/python/tests/test_delegation_module.py -v`
Expected: all 3 tests PASS

- [ ] **Step 4: Update legacy_dimension_types.py to import from delegation module**

Read `implementations/python/src/aep/legacy_dimension_types.py` first, then edit:

Add import:
```python
from axisrobo_harmovela_delegation import DELEGATION_EVENT_TYPES
```

Add `DELEGATION_EVENT_TYPES` to the union and remove the 5 delegation event type literals:
```python
from axisrobo_harmovela_context import CONTEXT_MEMORY_EVENT_TYPES
from axisrobo_harmovela_delegation import DELEGATION_EVENT_TYPES

LEGACY_DIMENSION_EVENT_TYPES = frozenset({
    "event.acknowledged", "event.rejected", "event.redelivered", "event.replayed", "event.dead_lettered",
    "tool.call.requested", "tool.call.accepted", "tool.call.rejected", "tool.call.started", "tool.call.progress",
    "tool.call.output", "tool.call.completed", "tool.call.failed", "tool.call.cancel.requested", "tool.call.cancelled",
    "tool.call.timed_out", "task.submitted", "task.accepted", "task.started", "task.blocked", "task.progress",
    "task.output", "task.completed", "task.failed", "task.cancel.requested", "task.cancelled", "task.timed_out",
    "agent.message.sent", "agent.message.received", "agent.message.failed", "agent.request.created", "agent.response.created",
    "agent.decision.recorded", "environment.observed", "environment.changed", "environment.alerted", "environment.error",
    "belief.revised", "belief.conflict.detected", "freshness.expired", "freshness.window.changed",
    "interruption.requested", "interruption.acknowledged", "interruption.saved", "interruption.resumed", "interruption.cancelled",
    "compensation.requested", "compensation.completed",
    "provenance.attestation.added", "provenance.attestation.revoked", "provenance.chain.truncated",
    "state.snapshot.requested", "state.snapshot.ready", "state.delta.applied", "state.invalidated",
}.union(CONTEXT_MEMORY_EVENT_TYPES).union(DELEGATION_EVENT_TYPES))


def is_legacy_dimension_event_type(type_: str) -> bool:
    return type_ in LEGACY_DIMENSION_EVENT_TYPES
```

- [ ] **Step 5: Run full Python test suite**

Run: `pytest implementations/python/tests/ -v` in `implementations/python`
Expected: all tests PASS (including legacy types tests)

- [ ] **Step 6: Commit Python changes**

```bash
git add implementations/python/src/axisrobo_harmovela_delegation/
git add implementations/python/tests/test_delegation_module.py
git add implementations/python/src/aep/legacy_dimension_types.py
git commit -m "feat(python): extract delegation dimension module

Create axisrobo_harmovela_delegation with 5 event types.
Register as adapter entry in aep.legacy_dimension_types."
```

---

### Task 3: Go Delegation Module

**Files:**
- Create: `implementations/go/delegation/delegation.go`
- Create: `implementations/go/delegation/delegation_test.go`
- Modify: `implementations/go/aep/event_types.go:1-78`

- [ ] **Step 1: Create Go delegation module source**

```go
package delegation

var EventTypes = map[string]bool{
	"delegation.requested":         true,
	"delegation.accepted":          true,
	"delegation.rejected":          true,
	"delegation.handoff.completed": true,
	"delegation.escalated":         true,
}

func IsEventType(typ string) bool {
	return EventTypes[typ]
}
```

Write: `implementations/go/delegation/delegation.go`

- [ ] **Step 2: Create delegation tests**

```go
package delegation

import "testing"

func TestDelegationEventTypesIncludesAll5RegistryEntries(t *testing.T) {
	expected := []string{
		"delegation.requested",
		"delegation.accepted",
		"delegation.rejected",
		"delegation.handoff.completed",
		"delegation.escalated",
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
		"delegation.requested",
		"delegation.accepted",
		"delegation.handoff.completed",
		"delegation.escalated",
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
		"context.updated",
		"",
	} {
		if IsEventType(typ) {
			t.Errorf("expected false for %s", typ)
		}
	}
}
```

Write: `implementations/go/delegation/delegation_test.go`

- [ ] **Step 3: Run delegation tests**

Run: `go test ./delegation/ -v` in `implementations/go`
Expected: all tests PASS

- [ ] **Step 4: Update aep/event_types.go to import from delegation module**

Read `implementations/go/aep/event_types.go` first, then edit:

Add import for delegation package:
```go
import (
	"github.com/axisrobo/harmovela/context"
	"github.com/axisrobo/harmovela/delegation"
	"github.com/axisrobo/harmovela/event"
)
```

Remove the 5 delegation entries from the `legacyStandardEventTypes` map:
```go
"delegation.requested":           true,
"delegation.accepted":            true,
"delegation.rejected":            true,
"delegation.handoff.completed":   true,
"delegation.escalated":           true,
```

Add after the `context.EventTypes` merge loop:
```go
for k, v := range delegation.EventTypes {
    m[k] = v
}
```

Final file:
```go
package aep

import (
	"github.com/axisrobo/harmovela/context"
	"github.com/axisrobo/harmovela/delegation"
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
	for k, v := range delegation.EventTypes {
		m[k] = v
	}
	return m
}()

// IsStandardEventType reports whether a type is supported by the legacy aep adapter.
func IsStandardEventType(typ string) bool {
	return event.IsStandardEventType(typ) || legacyStandardEventTypes[typ]
}
```

- [ ] **Step 5: Run full Go test suite**

Run: `go test ./...` in `implementations/go`
Expected: all tests PASS

- [ ] **Step 6: Commit Go changes**

```bash
git add implementations/go/delegation/
git add implementations/go/aep/event_types.go
git commit -m "feat(go): extract delegation dimension module

Create github.com/axisrobo/harmovela/delegation with 5 event types.
Register as adapter entry in aep/event_types.go."
```

---

### Task 4: Java Delegation Module

**Files:**
- Create: `implementations/java/src/main/java/com/axisrobo/harmovela/delegation/DelegationTypes.java`
- Create: `implementations/java/src/test/java/com/axisrobo/harmovela/delegation/DelegationTypesTest.java`
- Modify: `implementations/java/src/main/java/com/axisrobo/aep/EventTypes.java:1-41`

- [ ] **Step 1: Create Java delegation types class**

```java
package com.axisrobo.harmovela.delegation;

import java.util.Set;

public final class DelegationTypes {
    private DelegationTypes() {}

    public static final Set<String> EVENT_TYPES = Set.of(
        "delegation.requested",
        "delegation.accepted",
        "delegation.rejected",
        "delegation.handoff.completed",
        "delegation.escalated"
    );

    public static boolean isDelegationEventType(String type) {
        return type != null && EVENT_TYPES.contains(type);
    }
}
```

Write: `implementations/java/src/main/java/com/axisrobo/harmovela/delegation/DelegationTypes.java`

- [ ] **Step 2: Create delegation tests**

```java
package com.axisrobo.harmovela.delegation;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class DelegationTypesTest {
    @Test
    void includesAll5RegistryEntries() {
        assertEquals(5, DelegationTypes.EVENT_TYPES.size());
        assertTrue(DelegationTypes.EVENT_TYPES.contains("delegation.requested"));
        assertTrue(DelegationTypes.EVENT_TYPES.contains("delegation.accepted"));
        assertTrue(DelegationTypes.EVENT_TYPES.contains("delegation.rejected"));
        assertTrue(DelegationTypes.EVENT_TYPES.contains("delegation.handoff.completed"));
        assertTrue(DelegationTypes.EVENT_TYPES.contains("delegation.escalated"));
    }

    @Test
    void isDelegationEventTypePositives() {
        assertTrue(DelegationTypes.isDelegationEventType("delegation.requested"));
        assertTrue(DelegationTypes.isDelegationEventType("delegation.accepted"));
        assertTrue(DelegationTypes.isDelegationEventType("delegation.handoff.completed"));
        assertTrue(DelegationTypes.isDelegationEventType("delegation.escalated"));
    }

    @Test
    void isDelegationEventTypeNegatives() {
        assertFalse(DelegationTypes.isDelegationEventType("task.submitted"));
        assertFalse(DelegationTypes.isDelegationEventType("session.opened"));
        assertFalse(DelegationTypes.isDelegationEventType("context.updated"));
        assertFalse(DelegationTypes.isDelegationEventType(""));
        assertFalse(DelegationTypes.isDelegationEventType(null));
    }
}
```

Write: `implementations/java/src/test/java/com/axisrobo/harmovela/delegation/DelegationTypesTest.java`

- [ ] **Step 3: Run delegation tests**

Run: `mvn test -pl . -Dtest="com.axisrobo.harmovela.delegation.DelegationTypesTest"` in `implementations/java`
Expected: all tests PASS

- [ ] **Step 4: Update EventTypes.java to import from delegation module**

Read `implementations/java/src/main/java/com/axisrobo/aep/EventTypes.java` first, then edit:

Add import:
```java
import com.axisrobo.harmovela.delegation.DelegationTypes;
```

Remove the 5 delegation entries from the LEGACY_TYPES set:
```java
"delegation.requested", "delegation.accepted", "delegation.rejected",
"delegation.handoff.completed", "delegation.escalated",
```

Add after `types.addAll(ContextMemoryTypes.EVENT_TYPES);`:
```java
types.addAll(DelegationTypes.EVENT_TYPES);
```

Final file:
```java
package com.axisrobo.aep;

import com.axisrobo.harmovela.context.ContextMemoryTypes;
import com.axisrobo.harmovela.delegation.DelegationTypes;
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
            "interruption.requested", "interruption.acknowledged", "interruption.saved",
            "interruption.resumed", "interruption.cancelled",
            "compensation.requested", "compensation.completed",
            "provenance.attestation.added", "provenance.attestation.revoked", "provenance.chain.truncated",
            "state.snapshot.requested", "state.snapshot.ready", "state.delta.applied", "state.invalidated"
        ));
        types.addAll(ContextMemoryTypes.EVENT_TYPES);
        types.addAll(DelegationTypes.EVENT_TYPES);
        LEGACY_TYPES = Set.copyOf(types);
    }

    public static boolean isStandardEventType(String type) {
        return type != null && (com.axisrobo.harmovela.event.registry.EventTypes.isStandardEventType(type)
            || LEGACY_TYPES.contains(type));
    }
}
```

- [ ] **Step 5: Run full Java test suite**

Run: `mvn test` in `implementations/java`
Expected: all tests PASS

- [ ] **Step 6: Commit Java changes**

```bash
git add implementations/java/src/main/java/com/axisrobo/harmovela/delegation/
git add implementations/java/src/test/java/com/axisrobo/harmovela/delegation/
git add implementations/java/src/main/java/com/axisrobo/aep/EventTypes.java
git commit -m "feat(java): extract delegation dimension module

Create com.axisrobo.harmovela.delegation with 5 event types.
Register as adapter entry in aep.EventTypes."
```

---
