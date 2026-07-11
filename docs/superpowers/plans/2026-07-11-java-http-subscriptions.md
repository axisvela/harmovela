# Java HTTP Subscriptions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Java runtime to parity with TypeScript HTTP subscriptions: subscription persistence in every delivery store, a runtime subscription registry with buffered fanout, and HTTP subscription CRUD + long-poll + SSE endpoints.

**Architecture:** A `Subscriptions.matches(filter, event)` helper extends the existing `matchesType`. Delivery stores gain subscription CRUD behind the public `DeliveryStore` interface. `AepRuntimeService` gains a synchronized subscription registry that loads persisted subscriptions on start, fans matching events into per-subscription buffers on publish, and exposes drain/attach. `ApiServer` adds subscription routes and SSE and switches to a thread-pool executor so long-lived SSE requests do not block other requests.

**Tech Stack:** Java 21, `com.sun.net.httpserver`, Jackson, JUnit Jupiter.

**Design reference:** `docs/superpowers/specs/2026-07-11-multi-language-http-subscriptions-design.md`

---

## File Structure

- Modify `reference/java/src/main/java/com/axisrobo/aep/Subscriptions.java`: add `matches`.
- Modify `DeliveryStore.java` (interface), `InMemoryDeliveryStore.java`, `SqliteDeliveryStore.java`, `PostgresDeliveryStore.java`: subscription CRUD.
- Modify `runtime/AepRuntimeService.java`: registry, fanout, load on start.
- Modify `runtime/ApiServer.java`: subscription routes, long-poll, SSE, executor.
- Add tests under `src/test/java/com/axisrobo/aep`.

---

## Task 1: Subscriptions.matches filter helper

**Files:**
- Modify: `reference/java/src/main/java/com/axisrobo/aep/Subscriptions.java`
- Test: `reference/java/src/test/java/com/axisrobo/aep/SubscriptionsTest.java`

- [ ] **Step 1: Add failing test**

Append inside the `SubscriptionsTest` class in `reference/java/src/test/java/com/axisrobo/aep/SubscriptionsTest.java`:

```java
    @Test
    void matchesFilter() {
        var event = java.util.Map.<String, Object>of("type", "task.submitted", "source", "agent:x");
        assertTrue(Subscriptions.matches(java.util.Map.of("types", "task.*"), event));
        assertFalse(Subscriptions.matches(java.util.Map.of("types", "memory.*"), event));
        assertTrue(Subscriptions.matches(java.util.Map.of("types", "task.*", "source", "agent:x"), event));
        assertFalse(Subscriptions.matches(java.util.Map.of("source", "agent:y"), event));
        assertTrue(Subscriptions.matches(java.util.Map.of(), event));
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd reference/java && mvn test -Dtest=SubscriptionsTest`
Expected: compilation failure, `matches` not found.

- [ ] **Step 3: Implement matches**

In `reference/java/src/main/java/com/axisrobo/aep/Subscriptions.java`, add imports and methods. Change the file to:

```java
package com.axisrobo.aep;

import java.util.List;
import java.util.Map;

public final class Subscriptions {
    private Subscriptions() {}

    public static boolean matchesType(String pattern, String value) {
        if (pattern.equals("*") || pattern.equals(value)) return true;
        if (pattern.endsWith(".*")) {
            return value.startsWith(pattern.substring(0, pattern.length() - 1));
        }
        var patternParts = pattern.split("\\.");
        var valueParts = value.split("\\.");
        if (patternParts.length != valueParts.length) return false;
        for (int i = 0; i < patternParts.length; i++) {
            if (!patternParts[i].equals("*") && !patternParts[i].equals(valueParts[i])) {
                return false;
            }
        }
        return true;
    }

    public static boolean matches(Map<String, Object> filter, Map<String, Object> event) {
        var types = filter.get("types");
        if (types != null) {
            var type = event.get("type") instanceof String s ? s : "";
            if (!matchesTypeValue(types, type)) return false;
        }
        for (var field : new String[]{"source", "target", "topic", "session_id", "conversation_id", "task_id"}) {
            var expected = filter.get(field);
            if (expected == null) continue;
            if (!matchesValue(expected, event.get(field))) return false;
        }
        return true;
    }

    private static boolean matchesTypeValue(Object patterns, String value) {
        if (patterns instanceof String s) return matchesType(s, value);
        if (patterns instanceof List<?> list) {
            for (var item : list) {
                if (item instanceof String s && matchesType(s, value)) return true;
            }
        }
        return false;
    }

    private static boolean matchesValue(Object expected, Object actual) {
        if (expected instanceof List<?> list) {
            for (var item : list) {
                if (item.equals(actual)) return true;
            }
            return false;
        }
        return expected.equals(actual);
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd reference/java && mvn test -Dtest=SubscriptionsTest`
Expected: `Tests run: 2, Failures: 0`.

- [ ] **Step 5: Commit and push**

```bash
git add reference/java/src/main/java/com/axisrobo/aep/Subscriptions.java reference/java/src/test/java/com/axisrobo/aep/SubscriptionsTest.java
git commit -m "feat(java): add Subscriptions.matches filter helper"
git push origin master
```

---

## Task 2: Delivery store subscription CRUD

**Files:**
- Modify: `reference/java/src/main/java/com/axisrobo/aep/DeliveryStore.java`
- Modify: `reference/java/src/main/java/com/axisrobo/aep/InMemoryDeliveryStore.java`
- Modify: `reference/java/src/main/java/com/axisrobo/aep/SqliteDeliveryStore.java`
- Modify: `reference/java/src/main/java/com/axisrobo/aep/PostgresDeliveryStore.java`
- Test: `reference/java/src/test/java/com/axisrobo/aep/InMemoryDeliveryStoreTest.java`

- [ ] **Step 1: Add failing test**

Append inside `InMemoryDeliveryStoreTest`:

```java
    @Test
    void subscriptionCrud() {
        var store = new InMemoryDeliveryStore();
        store.createSubscription(Map.of("id", "sub_1", "filter", Map.of("types", "task.*"), "created_at", "2026-07-11T10:00:00Z"));
        assertNotNull(store.getSubscription("sub_1"));
        assertEquals(1, store.listSubscriptions().size());
        assertTrue(store.deleteSubscription("sub_1"));
        assertNull(store.getSubscription("sub_1"));
        assertFalse(store.deleteSubscription("sub_1"));
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd reference/java && mvn test -Dtest=InMemoryDeliveryStoreTest`
Expected: compilation failure, `createSubscription` not found.

- [ ] **Step 3: Extend the interface**

In `DeliveryStore.java`, add after `getDeadLettered`:

```java
    Map<String, Object> createSubscription(Map<String, Object> record);
    Map<String, Object> getSubscription(String id);
    List<Map<String, Object>> listSubscriptions();
    boolean deleteSubscription(String id);
```

- [ ] **Step 4: Implement in-memory CRUD**

In `InMemoryDeliveryStore.java`, add a field:

```java
    private final Map<String, Map<String, Object>> subscriptions = new LinkedHashMap<>();
```

Add methods:

```java
    public Map<String, Object> createSubscription(Map<String, Object> record) {
        subscriptions.put((String) record.get("id"), record);
        return record;
    }

    public Map<String, Object> getSubscription(String id) {
        return subscriptions.get(id);
    }

    public List<Map<String, Object>> listSubscriptions() {
        return new ArrayList<>(subscriptions.values());
    }

    public boolean deleteSubscription(String id) {
        return subscriptions.remove(id) != null;
    }
```

- [ ] **Step 5: Implement sqlite CRUD**

In `SqliteDeliveryStore.java` `initSchema`, add a table:

```java
            stmt.execute("""
                CREATE TABLE IF NOT EXISTS delivery_subscriptions (
                    id TEXT PRIMARY KEY,
                    filter TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
                """);
```

Add methods (the class already has a `MAPPER` field from the getDeadLettered work):

```java
    public Map<String, Object> createSubscription(Map<String, Object> record) {
        try (var stmt = conn.prepareStatement(
                "INSERT OR REPLACE INTO delivery_subscriptions (id, filter, created_at) VALUES (?,?,?)")) {
            stmt.setString(1, (String) record.get("id"));
            stmt.setString(2, MAPPER.writeValueAsString(record.get("filter")));
            stmt.setString(3, (String) record.get("created_at"));
            stmt.executeUpdate();
        } catch (Exception e) {
            throw new RuntimeException("createSubscription failed", e);
        }
        return record;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getSubscription(String id) {
        try (var stmt = conn.prepareStatement("SELECT id, filter, created_at FROM delivery_subscriptions WHERE id = ?")) {
            stmt.setString(1, id);
            try (var rs = stmt.executeQuery()) {
                if (!rs.next()) return null;
                return Map.of(
                    "id", rs.getString("id"),
                    "filter", MAPPER.readValue(rs.getString("filter"), Map.class),
                    "created_at", rs.getString("created_at"));
            }
        } catch (Exception e) {
            throw new RuntimeException("getSubscription failed", e);
        }
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> listSubscriptions() {
        var result = new ArrayList<Map<String, Object>>();
        try (var stmt = conn.prepareStatement("SELECT id, filter, created_at FROM delivery_subscriptions ORDER BY created_at");
             var rs = stmt.executeQuery()) {
            while (rs.next()) {
                result.add(Map.of(
                    "id", rs.getString("id"),
                    "filter", MAPPER.readValue(rs.getString("filter"), Map.class),
                    "created_at", rs.getString("created_at")));
            }
        } catch (Exception e) {
            throw new RuntimeException("listSubscriptions failed", e);
        }
        return result;
    }

    public boolean deleteSubscription(String id) {
        try (var stmt = conn.prepareStatement("DELETE FROM delivery_subscriptions WHERE id = ?")) {
            stmt.setString(1, id);
            return stmt.executeUpdate() > 0;
        } catch (Exception e) {
            throw new RuntimeException("deleteSubscription failed", e);
        }
    }
```

- [ ] **Step 6: Implement postgres CRUD**

In `PostgresDeliveryStore.java` `initSchema`, add a table using the `t(...)` prefix helper:

```java
            stmt.execute("CREATE TABLE IF NOT EXISTS " + t("subscriptions") + " ("
                + "id TEXT PRIMARY KEY, filter JSONB NOT NULL, created_at TEXT NOT NULL)");
```

Add methods (the class has a `MAPPER` field):

```java
    public Map<String, Object> createSubscription(Map<String, Object> record) {
        try (var stmt = conn.prepareStatement(
                "INSERT INTO " + t("subscriptions") + " (id, filter, created_at) VALUES (?,?::jsonb,?) "
                + "ON CONFLICT (id) DO UPDATE SET filter=EXCLUDED.filter, created_at=EXCLUDED.created_at")) {
            stmt.setString(1, (String) record.get("id"));
            stmt.setString(2, MAPPER.writeValueAsString(record.get("filter")));
            stmt.setString(3, (String) record.get("created_at"));
            stmt.executeUpdate();
        } catch (Exception e) {
            throw new RuntimeException("createSubscription failed", e);
        }
        return record;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getSubscription(String id) {
        try (var stmt = conn.prepareStatement("SELECT id, filter, created_at FROM " + t("subscriptions") + " WHERE id = ?")) {
            stmt.setString(1, id);
            try (var rs = stmt.executeQuery()) {
                if (!rs.next()) return null;
                return Map.of(
                    "id", rs.getString("id"),
                    "filter", MAPPER.readValue(rs.getString("filter"), Map.class),
                    "created_at", rs.getString("created_at"));
            }
        } catch (Exception e) {
            throw new RuntimeException("getSubscription failed", e);
        }
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> listSubscriptions() {
        var result = new ArrayList<Map<String, Object>>();
        try (var stmt = conn.prepareStatement("SELECT id, filter, created_at FROM " + t("subscriptions") + " ORDER BY created_at");
             var rs = stmt.executeQuery()) {
            while (rs.next()) {
                result.add(Map.of(
                    "id", rs.getString("id"),
                    "filter", MAPPER.readValue(rs.getString("filter"), Map.class),
                    "created_at", rs.getString("created_at")));
            }
        } catch (Exception e) {
            throw new RuntimeException("listSubscriptions failed", e);
        }
        return result;
    }

    public boolean deleteSubscription(String id) {
        try (var stmt = conn.prepareStatement("DELETE FROM " + t("subscriptions") + " WHERE id = ?")) {
            stmt.setString(1, id);
            return stmt.executeUpdate() > 0;
        } catch (Exception e) {
            throw new RuntimeException("deleteSubscription failed", e);
        }
    }
```

If `close` with `dropOnClose` drops tables, add `t("subscriptions")` to the DROP statement. Read `close` first and align.

- [ ] **Step 7: Run store tests**

Run: `cd reference/java && mvn test -Dtest=InMemoryDeliveryStoreTest,SqliteDeliveryStoreTest,PostgresDeliveryStoreTest`
Expected: all pass.

- [ ] **Step 8: Commit and push**

```bash
git add reference/java/src/main/java/com/axisrobo/aep/DeliveryStore.java reference/java/src/main/java/com/axisrobo/aep/InMemoryDeliveryStore.java reference/java/src/main/java/com/axisrobo/aep/SqliteDeliveryStore.java reference/java/src/main/java/com/axisrobo/aep/PostgresDeliveryStore.java reference/java/src/test/java/com/axisrobo/aep/InMemoryDeliveryStoreTest.java
git commit -m "feat(java): add subscription CRUD to delivery stores"
git push origin master
```

---

## Task 3: Runtime registry

**Files:**
- Modify: `reference/java/src/main/java/com/axisrobo/aep/runtime/AepRuntimeService.java`
- Test: `reference/java/src/test/java/com/axisrobo/aep/runtime/RuntimeSubscriptionsTest.java`

- [ ] **Step 1: Add failing test**

Create `reference/java/src/test/java/com/axisrobo/aep/runtime/RuntimeSubscriptionsTest.java`:

```java
package com.axisrobo.aep.runtime;

import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class RuntimeSubscriptionsTest {
    private Config noServerConfig() {
        return Config.defaultConfig().withStore("memory").withWebsocketEnabled(false).withSseEnabled(false)
            .withApi(new Config.Transport(false, "127.0.0.1", 0, "/aep/api"));
    }

    private Map<String, Object> event(String id, String type) {
        return Map.of("aep_version", "0.1", "id", id, "type", type,
            "source", "t", "created_at", "2026-07-11T10:00:00Z", "payload", Map.of());
    }

    @Test
    void registryBuffersMatchingEvents() {
        var svc = new AepRuntimeService(noServerConfig());
        svc.start();
        var record = svc.createSubscription(Map.of("types", "task.*"));
        var id = (String) record.get("id");
        svc.publish(event("evt_match", "task.submitted"));
        svc.publish(event("evt_skip", "session.opened"));
        var drained = svc.takeEvents(id, 100);
        assertEquals(1, drained.size());
        assertEquals("evt_match", drained.get(0).get("id"));
        svc.stop();
    }

    @Test
    void listsAndDeletes() {
        var svc = new AepRuntimeService(noServerConfig());
        svc.start();
        var record = svc.createSubscription(Map.of("types", "task.*"));
        var id = (String) record.get("id");
        assertEquals(1, svc.listSubscriptions().size());
        assertNotNull(svc.getSubscription(id));
        assertTrue(svc.deleteSubscription(id));
        assertNull(svc.getSubscription(id));
        svc.stop();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd reference/java && mvn test -Dtest=RuntimeSubscriptionsTest`
Expected: compilation failure, `createSubscription` not found on the service.

- [ ] **Step 3: Implement the registry**

In `reference/java/src/main/java/com/axisrobo/aep/runtime/AepRuntimeService.java`:

Add imports:

```java
import com.axisrobo.aep.Subscriptions;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;
```

Add a registry entry type and fields to the class:

```java
    private static class RegistryEntry {
        final Map<String, Object> record;
        final List<Map<String, Object>> buffer = new ArrayList<>();
        final java.util.Set<Consumer<Map<String, Object>>> sinks = java.util.concurrent.ConcurrentHashMap.newKeySet();
        RegistryEntry(Map<String, Object> record) { this.record = record; }
    }

    private final Map<String, RegistryEntry> subscriptions = new ConcurrentHashMap<>();
    private final int maxBuffer = 1000;
```

In `publish`, after the `ws.broadcast` block, add fanout:

```java
        for (var entry : subscriptions.values()) {
            @SuppressWarnings("unchecked")
            var filter = (Map<String, Object>) entry.record.getOrDefault("filter", Map.of());
            if (Subscriptions.matches(filter, event)) {
                synchronized (entry.buffer) {
                    entry.buffer.add(event);
                    if (entry.buffer.size() > maxBuffer) entry.buffer.remove(0);
                }
                for (var sink : entry.sinks) sink.accept(event);
            }
        }
```

In `start`, after the api branch and before `started = true;`, load persisted subscriptions:

```java
        for (var record : store.listSubscriptions()) {
            subscriptions.put((String) record.get("id"), new RegistryEntry(record));
        }
```

Add registry methods:

```java
    public Map<String, Object> createSubscription(Map<String, Object> filter) {
        var record = new LinkedHashMap<String, Object>();
        record.put("id", "sub_" + UUID.randomUUID().toString().replace("-", ""));
        record.put("filter", filter == null ? Map.of() : filter);
        record.put("created_at", Instant.now().toString());
        store.createSubscription(record);
        subscriptions.put((String) record.get("id"), new RegistryEntry(record));
        return record;
    }

    public List<Map<String, Object>> listSubscriptions() {
        var result = new ArrayList<Map<String, Object>>();
        for (var entry : subscriptions.values()) result.add(entry.record);
        return result;
    }

    public Map<String, Object> getSubscription(String id) {
        var entry = subscriptions.get(id);
        return entry == null ? null : entry.record;
    }

    public boolean deleteSubscription(String id) {
        var existed = subscriptions.remove(id) != null;
        store.deleteSubscription(id);
        return existed;
    }

    public List<Map<String, Object>> takeEvents(String id, int max) {
        var entry = subscriptions.get(id);
        if (entry == null) return List.of();
        synchronized (entry.buffer) {
            var n = Math.min(max, entry.buffer.size());
            var taken = new ArrayList<>(entry.buffer.subList(0, n));
            entry.buffer.subList(0, n).clear();
            return taken;
        }
    }

    public Runnable attachStream(String id, Consumer<Map<String, Object>> sink) {
        var entry = subscriptions.get(id);
        if (entry == null) return null;
        entry.sinks.add(sink);
        return () -> entry.sinks.remove(sink);
    }
```

- [ ] **Step 4: Run registry test**

Run: `cd reference/java && mvn test -Dtest=RuntimeSubscriptionsTest`
Expected: all pass.

- [ ] **Step 5: Commit and push**

```bash
git add reference/java/src/main/java/com/axisrobo/aep/runtime/AepRuntimeService.java reference/java/src/test/java/com/axisrobo/aep/runtime/RuntimeSubscriptionsTest.java
git commit -m "feat(java): add runtime subscription registry with fanout"
git push origin master
```

---

## Task 4: HTTP subscription endpoints, long-poll, SSE

**Files:**
- Modify: `reference/java/src/main/java/com/axisrobo/aep/runtime/ApiServer.java`
- Test: `reference/java/src/test/java/com/axisrobo/aep/runtime/ApiSubscriptionsTest.java`

- [ ] **Step 1: Add failing tests**

Create `reference/java/src/test/java/com/axisrobo/aep/runtime/ApiSubscriptionsTest.java`:

```java
package com.axisrobo.aep.runtime;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import java.net.URI;
import java.net.http.*;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class ApiSubscriptionsTest {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private AepRuntimeService startService() {
        var c = Config.defaultConfig().withStore("memory").withWebsocketEnabled(false).withSseEnabled(false)
            .withApi(new Config.Transport(true, "127.0.0.1", 0, "/aep/api"));
        var svc = new AepRuntimeService(c);
        svc.start();
        return svc;
    }

    @Test
    void crudAndLongPoll() throws Exception {
        var svc = startService();
        Thread.sleep(200);
        var base = "http://127.0.0.1:" + svc.apiPort() + "/aep/api";
        var client = HttpClient.newHttpClient();

        var create = client.send(HttpRequest.newBuilder(URI.create(base + "/subscriptions"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString("{\"filter\":{\"types\":\"task.*\"}}")).build(),
            HttpResponse.BodyHandlers.ofString());
        assertEquals(201, create.statusCode());
        var created = MAPPER.readValue(create.body(), Map.class);
        var id = (String) created.get("id");
        assertTrue(id.startsWith("sub_"));

        var list = client.send(HttpRequest.newBuilder(URI.create(base + "/subscriptions")).build(),
            HttpResponse.BodyHandlers.ofString());
        assertTrue(list.body().contains(id));

        svc.publish(Map.of("aep_version", "0.1", "id", "evt_lp", "type", "task.submitted",
            "source", "t", "created_at", "2026-07-11T10:00:00Z", "payload", Map.of()));
        var events = client.send(HttpRequest.newBuilder(URI.create(base + "/subscriptions/" + id + "/events")).build(),
            HttpResponse.BodyHandlers.ofString());
        assertTrue(events.body().contains("evt_lp"));

        var del = client.send(HttpRequest.newBuilder(URI.create(base + "/subscriptions/" + id)).DELETE().build(),
            HttpResponse.BodyHandlers.ofString());
        assertEquals(200, del.statusCode());

        var missing = client.send(HttpRequest.newBuilder(URI.create(base + "/subscriptions/" + id)).build(),
            HttpResponse.BodyHandlers.ofString());
        assertEquals(404, missing.statusCode());
        svc.stop();
    }

    @Test
    void sseStreamReceivesEvent() throws Exception {
        var svc = startService();
        Thread.sleep(200);
        var base = "http://127.0.0.1:" + svc.apiPort() + "/aep/api";
        var client = HttpClient.newHttpClient();

        var create = client.send(HttpRequest.newBuilder(URI.create(base + "/subscriptions"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString("{\"filter\":{\"types\":\"task.*\"}}")).build(),
            HttpResponse.BodyHandlers.ofString());
        var id = (String) MAPPER.readValue(create.body(), Map.class).get("id");

        var received = new java.util.concurrent.CompletableFuture<String>();
        client.sendAsync(HttpRequest.newBuilder(URI.create(base + "/subscriptions/" + id + "/stream")).build(),
            HttpResponse.BodyHandlers.ofLines())
            .thenAccept(resp -> resp.body().forEach(line -> {
                if (line.startsWith("data: ") && !received.isDone()) received.complete(line);
            }));

        Thread.sleep(200);
        svc.publish(Map.of("aep_version", "0.1", "id", "evt_sse", "type", "task.submitted",
            "source", "t", "created_at", "2026-07-11T10:00:00Z", "payload", Map.of()));

        var line = received.get(3, java.util.concurrent.TimeUnit.SECONDS);
        assertTrue(line.contains("evt_sse"));
        svc.stop();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd reference/java && mvn test -Dtest=ApiSubscriptionsTest`
Expected: FAIL — subscription routes return 404 / SSE not implemented.

- [ ] **Step 3: Switch the api server to a thread pool and add routes**

In `reference/java/src/main/java/com/axisrobo/aep/runtime/ApiServer.java`:

Add imports:

```java
import java.io.OutputStream;
import java.util.concurrent.Executors;
```

In `start`, replace `server.setExecutor(null);` with:

```java
        server.setExecutor(Executors.newCachedThreadPool());
```

In `handle`, add subscription branches before the final `else`:

```java
            } else if (route.equals("/subscriptions") && method.equals("POST")) {
                handleCreateSubscription(exchange);
            } else if (route.equals("/subscriptions") && method.equals("GET")) {
                send(exchange, 200, Map.of("subscriptions", service.listSubscriptions()));
            } else if (route.startsWith("/subscriptions/")) {
                handleSubscriptionItem(route, method, exchange);
```

Add handler methods:

```java
    @SuppressWarnings("unchecked")
    private void handleCreateSubscription(HttpExchange exchange) throws IOException {
        var raw = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        Map<String, Object> body;
        try {
            body = raw.isEmpty() ? Map.of() : (Map<String, Object>) MAPPER.readValue(raw, Map.class);
        } catch (Exception e) {
            send(exchange, 400, Map.of("error", "invalid JSON body"));
            return;
        }
        Map<String, Object> filter = body.get("filter") instanceof Map<?, ?> f
            ? (Map<String, Object>) f : body;
        var record = service.createSubscription(filter);
        send(exchange, 201, record);
    }

    private void handleSubscriptionItem(String route, String method, HttpExchange exchange) throws IOException {
        var rest = route.substring("/subscriptions/".length());
        if (rest.endsWith("/events") && method.equals("GET")) {
            var id = rest.substring(0, rest.length() - "/events".length());
            if (service.getSubscription(id) == null) { send(exchange, 404, Map.of("error", "not found")); return; }
            send(exchange, 200, Map.of("events", service.takeEvents(id, 100)));
            return;
        }
        if (rest.endsWith("/stream") && method.equals("GET")) {
            handleStream(rest.substring(0, rest.length() - "/stream".length()), exchange);
            return;
        }
        if (rest.contains("/")) { send(exchange, 404, Map.of("error", "not found")); return; }
        if (method.equals("GET")) {
            var record = service.getSubscription(rest);
            if (record == null) send(exchange, 404, Map.of("error", "not found"));
            else send(exchange, 200, record);
        } else if (method.equals("DELETE")) {
            if (service.deleteSubscription(rest)) send(exchange, 200, Map.of("deleted", true));
            else send(exchange, 404, Map.of("error", "not found"));
        } else {
            send(exchange, 404, Map.of("error", "not found"));
        }
    }

    private void handleStream(String id, HttpExchange exchange) throws IOException {
        if (service.getSubscription(id) == null) { send(exchange, 404, Map.of("error", "not found")); return; }
        exchange.getResponseHeaders().set("Content-Type", "text/event-stream");
        exchange.getResponseHeaders().set("Cache-Control", "no-cache");
        exchange.sendResponseHeaders(200, 0);
        var os = exchange.getResponseBody();
        var lock = new Object();
        try {
            writeRaw(os, lock, ": ok\n\n");
            for (var evt : service.takeEvents(id, 1000)) writeSse(os, lock, evt);
            var queue = new java.util.concurrent.LinkedBlockingQueue<Map<String, Object>>();
            var detach = service.attachStream(id, queue::offer);
            try {
                while (true) {
                    var evt = queue.take();
                    writeSse(os, lock, evt);
                }
            } finally {
                if (detach != null) detach.run();
            }
        } catch (Exception ignored) {
        } finally {
            try { os.close(); } catch (IOException ignored) {}
        }
    }

    private void writeSse(OutputStream os, Object lock, Map<String, Object> evt) throws IOException {
        writeRaw(os, lock, "data: " + MAPPER.writeValueAsString(evt) + "\n\n");
    }

    private void writeRaw(OutputStream os, Object lock, String text) throws IOException {
        synchronized (lock) {
            os.write(text.getBytes(StandardCharsets.UTF_8));
            os.flush();
        }
    }
```

Note: `attachStream` returns a `Runnable` detach handle; the stream loop blocks on a queue and writes SSE frames. When the client disconnects, `os.write`/`flush` throws, breaking the loop and detaching.

- [ ] **Step 4: Run subscription api tests**

Run: `cd reference/java && mvn test -Dtest=ApiSubscriptionsTest`
Expected: all pass.

- [ ] **Step 5: Commit and push**

```bash
git add reference/java/src/main/java/com/axisrobo/aep/runtime/ApiServer.java reference/java/src/test/java/com/axisrobo/aep/runtime/ApiSubscriptionsTest.java
git commit -m "feat(java): add HTTP subscription CRUD, long-poll, and SSE"
git push origin master
```

---

## Task 5: Final verification

- [ ] **Step 1: Run full Java suite**

Run: `cd reference/java && mvn test`
Expected: BUILD SUCCESS, all tests pass.

- [ ] **Step 2: Verify git sync**

Run: `git status -sb`
Expected: `## master...origin/master` with no changed files.
