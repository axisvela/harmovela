# Java Reference Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a minimal Java reference implementation under `reference/java/` that passes AEP-C0 and AEP-C1 conformance against the shared fixture manifest.

**Architecture:** One Maven module (`com.axisrobo:aep-reference-java`) with Jackson for JSON, JUnit 5 for tests. Eight source files mirror the Go reference structure: event types, errors, envelope, router, session, harness, fixtures. Conformance tests consume the shared manifest.

**Tech Stack:** JDK 21, Maven 3.9+, JUnit Jupiter 5.10+, Jackson Databind 2.17+.

---

## File Structure

- Create: `reference/java/pom.xml`
- Create: `reference/java/src/main/java/com/axisrobo/aep/EventTypes.java`
- Create: `reference/java/src/main/java/com/axisrobo/aep/Errors.java`
- Create: `reference/java/src/main/java/com/axisrobo/aep/Envelope.java`
- Create: `reference/java/src/main/java/com/axisrobo/aep/EventRouter.java`
- Create: `reference/java/src/main/java/com/axisrobo/aep/Session.java`
- Create: `reference/java/src/main/java/com/axisrobo/aep/Harness.java`
- Create: `reference/java/src/main/java/com/axisrobo/aep/Fixtures.java`
- Create: `reference/java/src/test/java/com/axisrobo/aep/EnvelopeTest.java`
- Create: `reference/java/src/test/java/com/axisrobo/aep/EventRouterTest.java`
- Create: `reference/java/src/test/java/com/axisrobo/aep/HarnessTest.java`
- Create: `reference/java/src/test/java/com/axisrobo/aep/ConformanceTest.java`
- Modify: `reference/java/README.md`
- Modify: `README.md`

---

### Task 1: Maven Setup, Event Types, And Errors

**Files:**
- Create: `reference/java/pom.xml`
- Create: `reference/java/src/main/java/com/axisrobo/aep/EventTypes.java`
- Create: `reference/java/src/main/java/com/axisrobo/aep/Errors.java`

- [ ] **Step 1: Create Maven POM**

Create `reference/java/pom.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.axisrobo</groupId>
    <artifactId>aep-reference-java</artifactId>
    <version>0.1.0-SNAPSHOT</version>
    <packaging>jar</packaging>

    <name>AEP Java Reference</name>
    <description>Draft Agent Event Protocol Java reference implementation.</description>

    <properties>
        <maven.compiler.release>21</maven.compiler.release>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>

    <dependencies>
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
            <version>2.17.2</version>
        </dependency>
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <version>5.10.3</version>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-surefire-plugin</artifactId>
                <version>3.2.5</version>
            </plugin>
        </plugins>
    </build>
</project>
```

Also create the directory structure — `reference/java/src/main/java/com/axisrobo/aep/` and `reference/java/src/test/java/com/axisrobo/aep/` must exist.

- [ ] **Step 2: Add EventTypes**

Create `reference/java/src/main/java/com/axisrobo/aep/EventTypes.java`:

```java
package com.axisrobo.aep;

import java.util.Set;

public final class EventTypes {
    private EventTypes() {}

    public static final Set<String> STANDARD_TYPES = Set.of(
        "session.opened", "session.ready", "session.heartbeat", "session.closed", "session.error",
        "capabilities.requested", "capabilities.declared", "capabilities.changed",
        "subscription.requested", "subscription.created", "subscription.rejected",
        "subscription.cancelled", "subscription.expired",
        "event.acknowledged", "event.rejected", "event.redelivered", "event.replayed", "event.dead_lettered",
        "tool.call.requested", "tool.call.accepted", "tool.call.rejected", "tool.call.started",
        "tool.call.progress", "tool.call.output", "tool.call.completed", "tool.call.failed",
        "tool.call.cancel.requested", "tool.call.cancelled", "tool.call.timed_out",
        "task.submitted", "task.accepted", "task.started", "task.blocked", "task.progress",
        "task.output", "task.completed", "task.failed", "task.cancel.requested", "task.cancelled", "task.timed_out",
        "context.updated", "context.invalidated", "context.snapshot.requested", "context.snapshot.ready",
        "context.retrieval.started", "context.retrieval.completed", "context.retrieval.failed",
        "memory.fact.added", "memory.fact.updated", "memory.fact.invalidated", "memory.episode.stored",
        "memory.preference.updated", "memory.constraint.updated", "memory.summary.ready", "memory.retrieval.ready",
        "agent.message.sent", "agent.message.received", "agent.message.failed",
        "agent.request.created", "agent.response.created", "agent.decision.recorded",
        "environment.observed", "environment.changed", "environment.alerted", "environment.error"
    );

    public static boolean isStandardEventType(String type) {
        return STANDARD_TYPES.contains(type);
    }
}
```

- [ ] **Step 3: Add Errors**

Create `reference/java/src/main/java/com/axisrobo/aep/Errors.java`:

```java
package com.axisrobo.aep;

import java.util.Map;

public final class Errors {
    private Errors() {}

    public static final String PROTOCOL_ERROR = "protocol_error";
    public static final String INVALID_ENVELOPE = "invalid_envelope";
    public static final String INVALID_EVENT_TYPE = "invalid_event_type";
    public static final String UNSUPPORTED_VERSION = "unsupported_version";
    public static final String UNAUTHORIZED = "unauthorized";
    public static final String SESSION_ERROR = "session_error";
    public static final String SESSION_TIMEOUT = "session_timeout";
    public static final String SESSION_CLOSED = "session_closed";
    public static final String SUBSCRIPTION_ERROR = "subscription_error";
    public static final String SUBSCRIPTION_REJECTED = "subscription_rejected";
    public static final String TASK_ERROR = "task_error";
    public static final String TASK_TIMEOUT = "task_timeout";
    public static final String TASK_CANCELLED = "task_cancelled";
    public static final String TOOL_ERROR = "tool_error";
    public static final String TOOL_TIMEOUT = "tool_timeout";
    public static final String INTERNAL_ERROR = "internal_error";

    public static Map<String, Object> errorPayload(String code, String message, boolean retryable) {
        return Map.of(
            "code", code,
            "message", message,
            "retryable", retryable,
            "details", Map.of()
        );
    }
}
```

- [ ] **Step 4: Run Maven compile**

```bash
cd reference/java
mvn compile -q
```

Expected: BUILD SUCCESS.

- [ ] **Step 5: Commit**

```bash
git add reference/java/pom.xml reference/java/src/main/java/com/axisrobo/aep/EventTypes.java reference/java/src/main/java/com/axisrobo/aep/Errors.java
git commit -m "feat: add Java Maven project with event types and error model"
```

Expected: commit succeeds.

---

### Task 2: Envelope Validation

**Files:**
- Create: `reference/java/src/main/java/com/axisrobo/aep/Envelope.java`
- Create: `reference/java/src/test/java/com/axisrobo/aep/EnvelopeTest.java`

- [ ] **Step 1: Write failing envelope tests**

Create `reference/java/src/test/java/com/axisrobo/aep/EnvelopeTest.java`:

```java
package com.axisrobo.aep;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.util.List;
import java.util.Map;

class EnvelopeTest {

    @Test
    void acceptsValidEnvelope() {
        var event = Map.<String, Object>of(
            "aep_version", "0.1",
            "id", "evt_001",
            "type", "task.submitted",
            "source", "agent:test",
            "created_at", "2026-07-09T10:00:00Z",
            "payload", Map.of()
        );
        var errs = Envelope.validate(event);
        assertTrue(errs.isEmpty(), "expected no errors, got " + errs);
    }

    @Test
    void rejectsMissingFields() {
        var event = Map.<String, Object>of();
        var errs = Envelope.validate(event);
        assertFalse(errs.isEmpty());
    }

    @Test
    void rejectsUnknownType() {
        var event = Map.<String, Object>of(
            "aep_version", "0.1",
            "id", "evt_001",
            "type", "not.a.real.type",
            "source", "agent:test",
            "created_at", "2026-07-09T10:00:00Z",
            "payload", Map.of()
        );
        var errs = Envelope.validate(event);
        assertFalse(errs.isEmpty());
    }

    @Test
    void rejectsUnsupportedVersion() {
        var event = Map.<String, Object>of(
            "aep_version", "99.9",
            "id", "evt_001",
            "type", "task.submitted",
            "source", "agent:test",
            "created_at", "2026-07-09T10:00:00Z",
            "payload", Map.of()
        );
        var errs = Envelope.validate(event);
        assertFalse(errs.isEmpty());
        var found = errs.stream().anyMatch(e -> e.contains("unsupported"));
        assertTrue(found, "expected unsupported version error, got " + errs);
    }
}
```

- [ ] **Step 2: Run test to verify failure**

```bash
cd reference/java
mvn test -pl . -Dtest=EnvelopeTest -q
```

Expected: FAIL with compilation error (Envelope class not found).

- [ ] **Step 3: Implement Envelope**

Create `reference/java/src/main/java/com/axisrobo/aep/Envelope.java`:

```java
package com.axisrobo.aep;

import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

public final class Envelope {
    private Envelope() {}

    private static final Set<String> DELIVERY_MODES = Set.of("best_effort", "at_least_once", "replayable");
    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_DATE_TIME;

    public static List<String> validate(Map<String, Object> value) {
        var errors = new ArrayList<String>();

        if (value == null) {
            return List.of("event must be a JSON object");
        }

        requireString(value, "aep_version", errors);
        requireString(value, "id", errors);
        requireString(value, "type", errors);
        requireString(value, "source", errors);
        requireString(value, "created_at", errors);

        if (!value.containsKey("payload")) {
            errors.add("payload is required");
        }

        var type = (String) value.get("type");
        if (type != null && !EventTypes.isStandardEventType(type)) {
            errors.add("type is not in the standard draft registry: " + type);
        }

        var version = (String) value.get("aep_version");
        if (version != null && !"0.1".equals(version)) {
            errors.add("unsupported protocol version: " + version);
        }

        var ts = (String) value.get("created_at");
        if (ts != null) {
            try {
                ISO.parse(ts);
            } catch (DateTimeParseException e) {
                errors.add("created_at must be an ISO-compatible timestamp");
            }
        }

        if (value.containsKey("delivery")) {
            validateDelivery(value.get("delivery"), errors);
        }

        if ("subscription.requested".equals(type)) {
            var payload = value.get("payload");
            if (payload instanceof Map<?, ?> p) {
                validateSubscriptionPayload(p, errors);
            }
        }

        return errors;
    }

    @SuppressWarnings("unchecked")
    private static void validateSubscriptionPayload(Map<?, ?> payload, List<String> errors) {
        if (payload.containsKey("types") && !isStringOrList(payload.get("types"))) {
            errors.add("subscription payload types must be a string or string array");
        }
        for (var field : List.of("source", "target", "topic", "session_id", "conversation_id", "task_id")) {
            if (payload.containsKey(field) && !isStringOrList(payload.get(field))) {
                errors.add("subscription payload " + field + " must be a string or string array");
            }
        }
    }

    @SuppressWarnings("unchecked")
    private static void validateDelivery(Object delivery, List<String> errors) {
        if (!(delivery instanceof Map<?, ?> d)) {
            errors.add("delivery must be an object when present");
            return;
        }
        var mode = d.get("mode");
        if (mode instanceof String s && !DELIVERY_MODES.contains(s)) {
            errors.add("delivery.mode must be one of: best_effort, at_least_once, replayable");
        }
    }

    private static void requireString(Map<String, Object> value, String field, List<String> errors) {
        var v = value.get(field);
        if (!(v instanceof String s) || s.isEmpty()) {
            errors.add(field + " must be a non-empty string");
        }
    }

    @SuppressWarnings("unchecked")
    private static boolean isStringOrList(Object v) {
        if (v instanceof String) return true;
        if (v instanceof List<?> list) {
            return list.stream().allMatch(item -> item instanceof String);
        }
        return false;
    }
}
```

- [ ] **Step 4: Run envelope tests**

```bash
cd reference/java
mvn test -pl . -Dtest=EnvelopeTest -q
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add reference/java/src/main/java/com/axisrobo/aep/Envelope.java reference/java/src/test/java/com/axisrobo/aep/EnvelopeTest.java
git commit -m "feat: add Java envelope validation"
```

Expected: commit succeeds.

---

### Task 3: Event Router

**Files:**
- Create: `reference/java/src/main/java/com/axisrobo/aep/EventRouter.java`
- Create: `reference/java/src/test/java/com/axisrobo/aep/EventRouterTest.java`

- [ ] **Step 1: Write failing router tests**

Create `reference/java/src/test/java/com/axisrobo/aep/EventRouterTest.java`:

```java
package com.axisrobo.aep;

import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class EventRouterTest {

    @Test
    void dispatchesToMatchingHandler() {
        var router = new EventRouter();
        var called = new boolean[]{false};
        router.on(event -> "task.started".equals(event.get("type")), event -> {
            called[0] = true;
            return Map.<String, Object>of("type", "event.acknowledged");
        });
        var results = router.dispatch(Map.of("type", "task.started"));
        assertTrue(called[0]);
        assertEquals(1, results.size());
    }

    @Test
    void matchAllHandlerReceivesEveryEvent() {
        var router = new EventRouter();
        var count = new int[]{0};
        router.onAll(event -> { count[0]++; return null; });
        router.dispatch(Map.of("type", "task.started"));
        router.dispatch(Map.of("type", "session.opened"));
        assertEquals(2, count[0]);
    }

    @Test
    void collectsMultipleResponses() {
        var router = new EventRouter();
        router.onAll(event -> List.of(
            Map.<String, Object>of("type", "event.acknowledged"),
            Map.<String, Object>of("type", "session.ready")
        ));
        var results = router.dispatch(Map.of("type", "task.started"));
        assertEquals(2, results.size());
    }

    @Test
    void noMatchReturnsEmpty() {
        var router = new EventRouter();
        router.on(event -> false, event -> Map.<String, Object>of("type", "event.acknowledged"));
        var results = router.dispatch(Map.of("type", "task.started"));
        assertTrue(results.isEmpty());
    }

    @Test
    void handlesListOfAnyResponse() {
        var router = new EventRouter();
        router.onAll(event -> List.of(
            Map.<String, Object>of("type", "event.acknowledged"),
            Map.<String, Object>of("type", "task.completed")
        ));
        var results = router.dispatch(Map.of("type", "task.started"));
        assertEquals(2, results.size());
    }
}
```

- [ ] **Step 2: Run test to verify failure**

```bash
cd reference/java
mvn test -pl . -Dtest=EventRouterTest -q
```

Expected: FAIL with compilation error.

- [ ] **Step 3: Implement EventRouter**

Create `reference/java/src/main/java/com/axisrobo/aep/EventRouter.java`:

```java
package com.axisrobo.aep;

import java.util.*;
import java.util.function.Function;
import java.util.function.Predicate;

public class EventRouter {

    private record Handler(Predicate<Map<String, Object>> match,
                           Function<Map<String, Object>, Object> handler) {}

    private final List<Handler> handlers = new ArrayList<>();

    public EventRouter on(Predicate<Map<String, Object>> match,
                          Function<Map<String, Object>, Object> handler) {
        handlers.add(new Handler(match, handler));
        return this;
    }

    public EventRouter onAll(Function<Map<String, Object>, Object> handler) {
        handlers.add(new Handler(e -> true, handler));
        return this;
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> dispatch(Map<String, Object> event) {
        var results = new ArrayList<Map<String, Object>>();
        for (var handler : handlers) {
            if (handler.match.test(event)) {
                var response = handler.handler.apply(event);
                if (response == null) continue;
                switch (response) {
                    case List<?> list -> {
                        for (var item : list) {
                            if (item instanceof Map<?, ?> m) {
                                results.add((Map<String, Object>) m);
                            }
                        }
                    }
                    case Map<?, ?> m -> results.add((Map<String, Object>) m);
                    default -> {}
                }
            }
        }
        return results;
    }
}
```

- [ ] **Step 4: Run router tests**

```bash
cd reference/java
mvn test -pl . -Dtest=EventRouterTest -q
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add reference/java/src/main/java/com/axisrobo/aep/EventRouter.java reference/java/src/test/java/com/axisrobo/aep/EventRouterTest.java
git commit -m "feat: add Java event router"
```

Expected: commit succeeds.

---

### Task 4: Session And Harness

**Files:**
- Create: `reference/java/src/main/java/com/axisrobo/aep/Session.java`
- Create: `reference/java/src/main/java/com/axisrobo/aep/Harness.java`
- Create: `reference/java/src/test/java/com/axisrobo/aep/HarnessTest.java`

- [ ] **Step 1: Write failing harness tests**

Create `reference/java/src/test/java/com/axisrobo/aep/HarnessTest.java`:

```java
package com.axisrobo.aep;

import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class HarnessTest {

    @Test
    void declaresCapabilities() {
        var h = new Harness();
        var event = Map.<String, Object>of(
            "aep_version", "0.1", "id", "evt_001",
            "type", "capabilities.requested", "source", "agent:test",
            "created_at", "2026-07-09T10:00:00Z", "payload", Map.of()
        );
        var responses = h.handle(event);
        assertEquals("capabilities.declared", responses.get(0).get("type"));
    }

    @Test
    void createsSubscription() {
        var h = new Harness();
        var event = Map.<String, Object>of(
            "aep_version", "0.1", "id", "evt_001",
            "type", "subscription.requested", "source", "agent:test",
            "created_at", "2026-07-09T10:00:00Z",
            "payload", Map.of("types", List.of("task.*"))
        );
        var responses = h.handle(event);
        assertEquals("subscription.created", responses.get(0).get("type"));
    }

    @Test
    void rejectsSubscriptionWithNoFilter() {
        var h = new Harness();
        var event = Map.<String, Object>of(
            "aep_version", "0.1", "id", "evt_001",
            "type", "subscription.requested", "source", "agent:test",
            "created_at", "2026-07-09T10:00:00Z", "payload", Map.of()
        );
        var responses = h.handle(event);
        assertEquals("subscription.rejected", responses.get(0).get("type"));
    }

    @Test
    void sessionOpenAndClose() {
        var h = new Harness();
        var open = Map.<String, Object>of(
            "aep_version", "0.1", "id", "evt_sess_001",
            "type", "session.opened", "source", "agent:test",
            "created_at", "2026-07-09T10:00:00Z",
            "payload", Map.of("session_id", "sess_01", "version", "0.1")
        );
        var responses = h.handle(open);
        assertTrue(responses.size() >= 2);
        var types = responses.stream().map(r -> (String) r.get("type")).toList();
        assertTrue(types.contains("session.opened"));
        assertTrue(types.contains("session.ready"));

        var close = Map.<String, Object>of(
            "aep_version", "0.1", "id", "evt_close_001",
            "type", "session.closed", "source", "agent:test",
            "created_at", "2026-07-09T10:05:00Z",
            "payload", Map.of("session_id", "sess_01", "reason", "done")
        );
        responses = h.handle(close);
        assertTrue(responses.stream().anyMatch(r -> "session.closed".equals(r.get("type"))));
    }

    @Test
    void taskLifecycle() {
        var h = new Harness();
        var submitted = Map.<String, Object>of(
            "aep_version", "0.1", "id", "evt_task_001",
            "type", "task.submitted", "source", "agent:test",
            "created_at", "2026-07-09T10:00:00Z",
            "task_id", "task_01",
            "payload", Map.of("task_id", "task_01", "description", "crawl")
        );
        var responses = h.handle(submitted);
        assertEquals("task.accepted", responses.get(0).get("type"));

        var started = Map.<String, Object>of(
            "aep_version", "0.1", "id", "evt_task_002",
            "type", "task.started", "source", "tool:crawl",
            "created_at", "2026-07-09T10:00:05Z",
            "task_id", "task_01",
            "payload", Map.of("task_id", "task_01", "state", "started")
        );
        responses = h.handle(started);
        assertTrue(responses.stream().anyMatch(r -> "event.acknowledged".equals(r.get("type"))));

        var completed = Map.<String, Object>of(
            "aep_version", "0.1", "id", "evt_task_005",
            "type", "task.completed", "source", "tool:crawl",
            "created_at", "2026-07-09T10:01:00Z",
            "task_id", "task_01",
            "payload", Map.of("task_id", "task_01", "state", "completed", "result", "done")
        );
        responses = h.handle(completed);
        assertTrue(responses.stream().anyMatch(r -> "task.completed".equals(r.get("type"))));
    }

    @Test
    void rejectsUnknownTask() {
        var h = new Harness();
        var event = Map.<String, Object>of(
            "aep_version", "0.1", "id", "evt_001",
            "type", "task.progress", "source", "tool:crawl",
            "created_at", "2026-07-09T10:00:00Z",
            "task_id", "task_unknown",
            "payload", Map.of("message", "progress")
        );
        var responses = h.handle(event);
        assertEquals("event.rejected", responses.get(0).get("type"));
    }
}
```

- [ ] **Step 2: Run test to verify failure**

```bash
cd reference/java
mvn test -pl . -Dtest=HarnessTest -q
```

Expected: FAIL with compilation error.

- [ ] **Step 3: Implement Session**

Create `reference/java/src/main/java/com/axisrobo/aep/Session.java`:

```java
package com.axisrobo.aep;

import java.time.Instant;
import java.util.Map;

public class Session {
    public enum State { CREATED, OPENED, READY, CLOSED, ERROR }

    private final String id;
    private final String source;
    private final String version;
    private State state = State.CREATED;
    private int eventId;

    public Session(String id, String source, String version) {
        this.id = id != null ? id : "sess_" + System.currentTimeMillis();
        this.source = source != null ? source : "aep:session";
        this.version = version != null ? version : "0.1";
    }

    public String getId() { return id; }
    public State getState() { return state; }
    public boolean isActive() { return state == State.OPENED || state == State.READY; }
    public boolean isOpen() { return state == State.OPENED; }

    private String nextEventId() {
        eventId++;
        return "evt_sess_" + String.format("%06d", eventId);
    }

    private static String now() { return Instant.now().toString(); }

    public Map<String, Object> opened() {
        if (state != State.CREATED) throw new IllegalStateException("cannot open session in state " + state);
        state = State.OPENED;
        var ts = now();
        return Map.<String, Object>of(
            "aep_version", version, "id", nextEventId(), "type", "session.opened",
            "source", source, "session_id", id, "created_at", ts,
            "payload", Map.of("session_id", id, "version", version)
        );
    }

    public Map<String, Object> ready(Map<String, Object> capabilities) {
        if (state != State.OPENED && state != State.CREATED)
            throw new IllegalStateException("cannot mark session ready in state " + state);
        if (state == State.CREATED) opened();
        state = State.READY;
        var ts = now();
        return Map.<String, Object>of(
            "aep_version", version, "id", nextEventId(), "type", "session.ready",
            "source", source, "session_id", id, "created_at", ts,
            "payload", Map.of("session_id", id, "capabilities", capabilities)
        );
    }

    public Map<String, Object> close() {
        if (state == State.CLOSED) return null;
        state = State.CLOSED;
        var ts = now();
        return Map.<String, Object>of(
            "aep_version", version, "id", nextEventId(), "type", "session.closed",
            "source", source, "session_id", id, "created_at", ts,
            "payload", Map.of("session_id", id, "reason", "done")
        );
    }
}
```

- [ ] **Step 4: Implement Harness**

Create `reference/java/src/main/java/com/axisrobo/aep/Harness.java`:

```java
package com.axisrobo.aep;

import java.time.Instant;
import java.util.*;

public class Harness {

    // --- TaskTracker ---
    public enum TaskState { SUBMITTED, ACCEPTED, STARTED, PROGRESS, BLOCKED, OUTPUT, COMPLETED, FAILED, CANCELLED, TIMED_OUT }

    private static final Map<String, TaskState> EVENT_TO_STATE = Map.ofEntries(
        Map.entry("task.submitted", TaskState.SUBMITTED), Map.entry("task.accepted", TaskState.ACCEPTED),
        Map.entry("task.started", TaskState.STARTED), Map.entry("task.progress", TaskState.PROGRESS),
        Map.entry("task.blocked", TaskState.BLOCKED), Map.entry("task.output", TaskState.OUTPUT),
        Map.entry("task.completed", TaskState.COMPLETED), Map.entry("task.failed", TaskState.FAILED),
        Map.entry("task.cancelled", TaskState.CANCELLED), Map.entry("task.timed_out", TaskState.TIMED_OUT)
    );

    private static final Set<TaskState> TERMINAL = Set.of(TaskState.COMPLETED, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT);

    private static final Map<TaskState, Set<TaskState>> TRANSITIONS = Map.of(
        TaskState.SUBMITTED, Set.of(TaskState.ACCEPTED, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT),
        TaskState.ACCEPTED, Set.of(TaskState.STARTED, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT),
        TaskState.STARTED, Set.of(TaskState.PROGRESS, TaskState.OUTPUT, TaskState.BLOCKED, TaskState.COMPLETED, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT),
        TaskState.BLOCKED, Set.of(TaskState.STARTED, TaskState.PROGRESS, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT),
        TaskState.PROGRESS, Set.of(TaskState.PROGRESS, TaskState.OUTPUT, TaskState.BLOCKED, TaskState.COMPLETED, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT),
        TaskState.OUTPUT, Set.of(TaskState.PROGRESS, TaskState.OUTPUT, TaskState.BLOCKED, TaskState.COMPLETED, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT)
    );

    static class TaskTracker {
        private final String id;
        private final String source;
        private TaskState state = TaskState.SUBMITTED;
        private int eventId;

        TaskTracker(String id, String source) {
            this.id = id;
            this.source = source;
        }

        TaskState getState() { return state; }
        boolean isTerminal() { return TERMINAL.contains(state); }

        void accept() { transition("task.accepted", null); }

        Map<String, Object> transition(String eventType, Map<String, Object> payload) {
            var nextState = EVENT_TO_STATE.get(eventType);
            if (nextState == null) return null;

            if (nextState != state) {
                var allowed = TRANSITIONS.get(state);
                if (allowed == null || !allowed.contains(nextState)) return null;
            }
            state = nextState;

            var result = new HashMap<String, Object>();
            if (payload != null) result.putAll(payload);
            result.put("task_id", id);
            result.put("state", state.name().toLowerCase());

            if (TERMINAL.contains(state) && !result.containsKey("result")) {
                result.put("result", state.name().toLowerCase());
            }

            eventId++;
            return Map.<String, Object>of(
                "aep_version", "0.1",
                "id", "evt_task_" + String.format("%06d", eventId),
                "type", eventType,
                "source", source,
                "task_id", id,
                "created_at", Instant.now().toString(),
                "payload", result
            );
        }
    }

    // --- Harness ---
    private static final String SOURCE = "harness:aep";
    private int sequence;
    private final Map<String, Map<String, Object>> subscriptions = new LinkedHashMap<>();
    private final Map<String, TaskTracker> tasks = new LinkedHashMap<>();
    private final EventRouter router = new EventRouter();
    private Session session;

    public Harness() {
        router
            .on(e -> "capabilities.requested".equals(e.get("type")), this::handleCapabilities)
            .on(e -> "subscription.requested".equals(e.get("type")), this::handleSubscriptionRequested)
            .on(e -> "subscription.cancelled".equals(e.get("type")), this::handleSubscriptionCancelled)
            .on(e -> "task.submitted".equals(e.get("type")), this::handleTaskSubmitted)
            .on(e -> {
                var t = (String) e.get("type");
                return t != null && t.startsWith("task.") && !"task.submitted".equals(t);
            }, this::handleTaskEvent)
            .on(e -> "session.opened".equals(e.get("type")), this::handleSessionOpened)
            .on(e -> "session.closed".equals(e.get("type")), this::handleSessionClosed);
    }

    public Session getSession() { return session; }
    public Map<String, Map<String, Object>> getSubscriptions() { return subscriptions; }
    public Map<String, TaskTracker> getTasks() { return tasks; }

    public List<Map<String, Object>> handle(Map<String, Object> value) {
        var errs = Envelope.validate(value);
        if (!errs.isEmpty()) {
            return List.of(newEvent("event.rejected", value, Map.of(
                "errors", errs, "error", Errors.errorPayload(Errors.INVALID_ENVELOPE, errs.get(0), false)
            )));
        }

        var type = (String) value.get("type");
        if (!EventTypes.isStandardEventType(type) && (type == null || !type.startsWith("session."))) {
            return List.of(newEvent("event.rejected", value, Map.of(
                "errors", List.of("type not in standard draft registry: " + type),
                "error", Errors.errorPayload(Errors.INVALID_EVENT_TYPE, "unknown event type: " + type, false)
            )));
        }

        if (!"0.1".equals(value.get("aep_version"))) {
            return List.of(newEvent("event.rejected", value, Map.of(
                "errors", List.of("unsupported protocol version: " + value.get("aep_version")),
                "error", Errors.errorPayload(Errors.UNSUPPORTED_VERSION, "unsupported version " + value.get("aep_version"), false)
            )));
        }

        var routed = router.dispatch(value);
        if (!routed.isEmpty()) return routed;

        return List.of(newEvent("event.acknowledged", value, Map.of("acknowledged_event_id", value.get("id"))));
    }

    private Object handleCapabilities(Map<String, Object> event) {
        return newEvent("capabilities.declared", event, Map.of(
            "protocol", "aep", "aep_version", "0.1",
            "transports", List.of("stdio"),
            "delivery_modes", List.of("best_effort", "at_least_once", "replayable"),
            "features", List.of("envelope_validation", "event_type_registry", "subscription_matching",
                "session_lifecycle", "task_lifecycle", "error_model", "event_routing")
        ));
    }

    @SuppressWarnings("unchecked")
    private Object handleSubscriptionRequested(Map<String, Object> event) {
        var payload = (Map<String, Object>) event.getOrDefault("payload", Map.of());
        var subId = "sub_" + String.format("%04d", nextSeq());

        var hasFilter = payload.containsKey("types") || payload.containsKey("source")
            || payload.containsKey("target") || payload.containsKey("topic");
        if (!hasFilter) {
            return newEvent("subscription.rejected", event, Map.of(
                "subscription_id", subId, "filter", payload,
                "error", Errors.errorPayload(Errors.SUBSCRIPTION_REJECTED, "subscription must include at least one filter criterion", false)
            ));
        }

        subscriptions.put(subId, Map.of("id", subId, "filter", payload, "created_at", Instant.now().toString()));
        return newEvent("subscription.created", event, Map.of("subscription_id", subId, "filter", payload));
    }

    @SuppressWarnings("unchecked")
    private Object handleSubscriptionCancelled(Map<String, Object> event) {
        var payload = (Map<String, Object>) event.get("payload");
        if (payload != null && payload.get("subscription_id") instanceof String subId) {
            subscriptions.remove(subId);
        }
        return newEvent("event.acknowledged", event, Map.of("acknowledged_event_id", event.get("id")));
    }

    @SuppressWarnings("unchecked")
    private Object handleTaskSubmitted(Map<String, Object> event) {
        var taskId = (String) event.getOrDefault("task_id", null);
        if (taskId == null && event.get("payload") instanceof Map<?, ?> p) {
            taskId = (String) p.get("task_id");
        }
        if (taskId == null) taskId = "task_" + System.currentTimeMillis();

        if (tasks.containsKey(taskId)) {
            return newEvent("event.rejected", event, Map.of(
                "error", Errors.errorPayload(Errors.TASK_ERROR, "duplicate task id: " + taskId, false)
            ));
        }

        var source = (String) event.getOrDefault("source", "unknown");
        var tracker = new TaskTracker(taskId, source);
        tracker.accept();
        tasks.put(taskId, tracker);

        return newEvent("task.accepted", event, Map.of("task_id", taskId, "status", "accepted"));
    }

    @SuppressWarnings("unchecked")
    private Object handleTaskEvent(Map<String, Object> event) {
        var taskId = (String) event.getOrDefault("task_id", null);
        if (taskId == null && event.get("payload") instanceof Map<?, ?> p) {
            taskId = (String) p.get("task_id");
        }
        if (taskId == null) return null;

        var tracker = tasks.get(taskId);
        if (tracker == null) {
            return newEvent("event.rejected", event, Map.of(
                "error", Errors.errorPayload(Errors.TASK_ERROR, "unknown task: " + taskId, false)
            ));
        }

        var eventType = (String) event.get("type");
        var payload = event.get("payload") instanceof Map<?, ?> p ? (Map<String, Object>) p : null;
        var taskEvent = tracker.transition(eventType, payload);
        if (taskEvent == null) {
            return newEvent("event.rejected", event, Map.of(
                "error", Errors.errorPayload(Errors.TASK_ERROR, "illegal task transition: " + tracker.getState() + " for task " + taskId, false)
            ));
        }

        var responses = new ArrayList<>(List.of(newEvent("event.acknowledged", event, Map.of("acknowledged_event_id", event.get("id")))));
        responses.add(taskEvent);

        if (tracker.isTerminal()) tasks.remove(taskId);
        return responses;
    }

    private Object handleSessionOpened(Map<String, Object> event) {
        if (session != null && session.isActive()) {
            return newEvent("event.rejected", event, Map.of(
                "error", Errors.errorPayload(Errors.SESSION_ERROR, "session already active", false)
            ));
        }
        var sessionId = (String) event.getOrDefault("session_id", null);
        session = new Session(sessionId, SOURCE, "0.1");
        var opened = session.opened();

        var ready = Map.<String, Object>of(
            "aep_version", "0.1",
            "id", "evt_sess_ready_" + System.currentTimeMillis(),
            "type", "session.ready",
            "source", SOURCE,
            "session_id", session.getId(),
            "created_at", Instant.now().toString(),
            "payload", Map.of("session_id", session.getId(),
                "capabilities", Map.of("protocol", "aep", "aep_version", "0.1",
                    "transports", List.of("stdio"),
                    "features", List.of("envelope", "subscription", "task_lifecycle", "error_model")))
        );

        return List.of(opened, ready);
    }

    private Object handleSessionClosed(Map<String, Object> event) {
        var responses = new ArrayList<>(List.of(newEvent("event.acknowledged", event, Map.of("acknowledged_event_id", event.get("id")))));
        if (session != null && session.isOpen()) {
            var closed = session.close();
            if (closed != null) responses.add(closed);
        }
        return responses;
    }

    private int nextSeq() { return ++sequence; }

    private Map<String, Object> newEvent(String type, Map<String, Object> input, Map<String, Object> payload) {
        var seq = nextSeq();
        return new LinkedHashMap<>(Map.<String, Object>of(
            "aep_version", input.getOrDefault("aep_version", "0.1"),
            "id", "evt_harness_" + String.format("%06d", seq),
            "type", type,
            "source", SOURCE,
            "target", input.get("source"),
            "session_id", input.get("session_id"),
            "task_id", input.get("task_id"),
            "causation_id", input.get("id"),
            "created_at", Instant.now().toString(),
            "delivery", Map.of("mode", "best_effort", "sequence", seq),
            "payload", payload
        ));
    }
}
```

- [ ] **Step 5: Run harness tests**

```bash
cd reference/java
mvn test -pl . -Dtest=HarnessTest -q
```

Expected: 6 tests pass.

- [ ] **Step 6: Run all Java tests**

```bash
cd reference/java
mvn test -q
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add reference/java/src/main/java/com/axisrobo/aep/Session.java reference/java/src/main/java/com/axisrobo/aep/Harness.java reference/java/src/test/java/com/axisrobo/aep/HarnessTest.java
git commit -m "feat: add Java session and harness"
```

Expected: commit succeeds.

---

### Task 5: Fixtures And Conformance Tests

**Files:**
- Create: `reference/java/src/main/java/com/axisrobo/aep/Fixtures.java`
- Create: `reference/java/src/test/java/com/axisrobo/aep/ConformanceTest.java`

- [ ] **Step 1: Add Fixtures**

Create `reference/java/src/main/java/com/axisrobo/aep/Fixtures.java`:

```java
package com.axisrobo.aep;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.stream.Collectors;

public final class Fixtures {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public record ManifestFixture(String path, String level, String description,
                                  String expectation, List<String> tags, List<String> expectedTypes) {}

    public record Manifest(String aep_version, String default_target_level,
                           List<String> levels, List<ManifestFixture> fixtures) {}

    public static Manifest loadManifest(String path) throws IOException {
        return MAPPER.readValue(Path.of(path).toFile(), Manifest.class);
    }

    public static List<Map<String, Object>> loadFixture(String path) throws IOException {
        var text = Files.readString(Path.of(path));
        return Arrays.stream(text.strip().split("\n"))
            .filter(line -> !line.isBlank())
            .map(line -> {
                try {
                    return MAPPER.<Map<String, Object>>readValue(line, new TypeReference<>() {});
                } catch (IOException e) {
                    throw new RuntimeException("invalid NDJSON line", e);
                }
            })
            .collect(Collectors.toList());
    }
}
```

- [ ] **Step 2: Add conformance test**

Create `reference/java/src/test/java/com/axisrobo/aep/ConformanceTest.java`:

```java
package com.axisrobo.aep;

import org.junit.jupiter.api.Test;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class ConformanceTest {

    private static final Map<String, Integer> LEVEL_ORDER = Map.of("AEP-C0", 0, "AEP-C1", 1, "AEP-C2", 2);

    @Test
    void manifestDeclaresKnownDraftLevels() throws Exception {
        var manifest = Fixtures.loadManifest("../../conformance/manifest.json");
        assertEquals(List.of("AEP-C0", "AEP-C1", "AEP-C2"), manifest.levels());
        assertEquals("AEP-C1", manifest.default_target_level());
    }

    @Test
    void conformanceFixtures() throws Exception {
        var manifest = Fixtures.loadManifest("../../conformance/manifest.json");
        var targetOrder = LEVEL_ORDER.getOrDefault(manifest.default_target_level(), 1);

        for (var fixture : manifest.fixtures()) {
            var fixtureOrder = LEVEL_ORDER.getOrDefault(fixture.level(), -1);
            if (fixtureOrder > targetOrder) {
                System.out.println("SKIP " + fixture.level() + " " + fixture.path());
                continue;
            }

            var absPath = Path.of("../../conformance", fixture.path()).toString();
            var events = Fixtures.loadFixture(absPath);

            var types = events.stream().map(e -> (String) e.get("type")).toList();
            assertEquals(fixture.expectedTypes(), types, "type mismatch for " + fixture.path());

            for (int i = 0; i < events.size(); i++) {
                var errs = Envelope.validate(events.get(i));
                assertTrue(errs.isEmpty(), "event " + i + " envelope validation: " + errs);
            }

            if ("stateful_flow".equals(fixture.expectation())) {
                var harness = new Harness();
                for (int i = 0; i < events.size(); i++) {
                    var responses = harness.handle(events.get(i));
                    for (var resp : responses) {
                        if ("event.rejected".equals(resp.get("type"))) {
                            var errMsg = "unknown";
                            if (resp.get("payload") instanceof Map<?, ?> p
                                && p.get("error") instanceof Map<?, ?> e) {
                                errMsg = String.valueOf(e.get("message"));
                            }
                            fail("event " + i + " rejected: " + errMsg);
                        }
                    }
                }
            }
        }
    }
}
```

- [ ] **Step 3: Run conformance tests**

```bash
cd reference/java
mvn test -pl . -Dtest=ConformanceTest -q
```

Expected: manifest test + 3 fixture tests pass, C2 delivery skipped.

- [ ] **Step 4: Run all Java tests**

```bash
cd reference/java
mvn test -q
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add reference/java/src/main/java/com/axisrobo/aep/Fixtures.java reference/java/src/test/java/com/axisrobo/aep/ConformanceTest.java
git commit -m "feat: add Java conformance tests"
```

Expected: commit succeeds.

---

### Task 6: Documentation, Verification, And Push

**Files:**
- Modify: `reference/java/README.md`
- Modify: `README.md`

- [ ] **Step 1: Update Java README**

Replace `reference/java/README.md`:

```markdown
# AEP Java Reference

Java reference implementation of the Agent Event Protocol draft.

## Setup

Requirements: JDK 21, Maven 3.9+.

```sh
cd reference/java
mvn compile
```

## Run Tests

```sh
mvn test
```

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

- [ ] **Step 2: Update root README**

Replace the Java line under Repository Layout:

```markdown
- `reference/java/` — planned JVM reference implementation
```

with:

```markdown
- `reference/java/` — draft reference implementation with C0/C1 conformance (JDK 21)
```

- [ ] **Step 3: Full cross-language verification**

```bash
cd reference/java && mvn test -q
cd reference/typescript && npm test && npm run conformance
cd reference/python && python -m pytest --tb=short -q
cd reference/go && go test ./aep/ -v
```

Expected: Java tests pass, TS 95 + conformance, Python 71, Go 17.

- [ ] **Step 4: Commit and push**

```bash
git add reference/java/README.md README.md
git commit -m "docs: update Java reference status"
git status --short
git log --oneline -5
git push
```

Expected: clean tree, push succeeds.

---

## Self-Review Notes

- Spec coverage: Task 1 covers Maven + event types + errors. Task 2 covers envelope. Task 3 covers router. Task 4 covers session + harness. Task 5 covers fixtures + conformance. Task 6 covers docs + verification + push.
- Scope: no transports, no delivery store, no concurrency. Matches design spec.
- Placeholder scan: no TBD/TODO/fill-in markers.
- Type consistency: `Map<String, Object>` used throughout. Method names match Go/TS patterns (snake_case in test assertions matching JSON key names).
