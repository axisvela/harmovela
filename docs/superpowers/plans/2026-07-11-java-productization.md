# Java Productization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Java reference a config loader, a runtime service, an `aepd` daemon, an `aep` CLI, and an HTTP read+ingest API, matching TypeScript core parity.

**Architecture:** A `Subscriptions.matchesType` helper is extracted. Delivery stores gain `getDeadLettered` and the `DeliveryStore` interface is made public. A `com.axisrobo.aep.runtime` package provides `Config`, `AepRuntimeService` (compose validation, subscriber fanout, broadcast WebSocket, delivery store), and `ApiServer` (JDK `com.sun.net.httpserver`). A picocli CLI and a daemon main class wrap the runtime. The existing `WsServer` already broadcasts, so no transport rewrite is needed.

**Tech Stack:** Java 21, Jackson, `org.java-websocket`, JDK `com.sun.net.httpserver`, `info.picocli`, JUnit Jupiter.

**Design reference:** `docs/superpowers/specs/2026-07-11-multi-language-productization-design.md`

---

## File Structure

- Create `reference/java/src/main/java/com/axisrobo/aep/Subscriptions.java`: `matchesType`.
- Modify `DeliveryStore.java`: make public, add `getDeadLettered`.
- Modify `InMemoryDeliveryStore.java`, `SqliteDeliveryStore.java`, `PostgresDeliveryStore.java`: add `getDeadLettered`; fix sqlite reason to JSON.
- Create `runtime/Config.java`, `runtime/AepRuntimeService.java`, `runtime/ApiServer.java`, `runtime/Aepd.java`.
- Create `cli/AepCli.java` (picocli).
- Modify `pom.xml`: add picocli.
- Create tests under `src/test/java/com/axisrobo/aep`.

---

## Task 1: Subscriptions.matchesType

**Files:**
- Create: `reference/java/src/main/java/com/axisrobo/aep/Subscriptions.java`
- Test: `reference/java/src/test/java/com/axisrobo/aep/SubscriptionsTest.java`

- [ ] **Step 1: Write failing test**

Create `reference/java/src/test/java/com/axisrobo/aep/SubscriptionsTest.java`:

```java
package com.axisrobo.aep;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class SubscriptionsTest {
    @Test
    void matchesType() {
        assertTrue(Subscriptions.matchesType("*", "task.submitted"));
        assertTrue(Subscriptions.matchesType("task.*", "task.submitted"));
        assertFalse(Subscriptions.matchesType("task.*", "memory.updated"));
        assertTrue(Subscriptions.matchesType("task.submitted", "task.submitted"));
        assertFalse(Subscriptions.matchesType("task.submitted", "task.accepted"));
        assertTrue(Subscriptions.matchesType("task.*.done", "task.build.done"));
        assertFalse(Subscriptions.matchesType("task.*.done", "task.build.failed"));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd reference/java && mvn test -Dtest=SubscriptionsTest`
Expected: compilation failure, `Subscriptions` not found.

- [ ] **Step 3: Implement Subscriptions**

Create `reference/java/src/main/java/com/axisrobo/aep/Subscriptions.java`:

```java
package com.axisrobo.aep;

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
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd reference/java && mvn test -Dtest=SubscriptionsTest`
Expected: `Tests run: 1, Failures: 0`.

- [ ] **Step 5: Commit and push**

```bash
git add reference/java/src/main/java/com/axisrobo/aep/Subscriptions.java reference/java/src/test/java/com/axisrobo/aep/SubscriptionsTest.java
git commit -m "feat(java): add Subscriptions.matchesType helper"
git push origin master
```

---

## Task 2: DeliveryStore getDeadLettered

**Files:**
- Modify: `reference/java/src/main/java/com/axisrobo/aep/DeliveryStore.java`
- Modify: `reference/java/src/main/java/com/axisrobo/aep/InMemoryDeliveryStore.java`
- Modify: `reference/java/src/main/java/com/axisrobo/aep/SqliteDeliveryStore.java`
- Modify: `reference/java/src/main/java/com/axisrobo/aep/PostgresDeliveryStore.java`
- Test: `reference/java/src/test/java/com/axisrobo/aep/InMemoryDeliveryStoreTest.java`

- [ ] **Step 1: Write failing test**

Append to `reference/java/src/test/java/com/axisrobo/aep/InMemoryDeliveryStoreTest.java` (inside the class):

```java
    @Test
    void listsDeadLetteredRecords() {
        var store = new InMemoryDeliveryStore();
        store.track("evt_1", "sub_01");
        store.deadLetter("evt_1", java.util.Map.of("error", java.util.Map.of("code", "timeout")));
        var records = store.getDeadLettered();
        assertEquals(1, records.size());
        assertEquals("evt_1", records.get(0).get("eventId"));
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd reference/java && mvn test -Dtest=InMemoryDeliveryStoreTest`
Expected: compilation failure, `getDeadLettered` not found.

- [ ] **Step 3: Make the interface public and add the method**

Replace `reference/java/src/main/java/com/axisrobo/aep/DeliveryStore.java` with:

```java
package com.axisrobo.aep;

import java.util.List;
import java.util.Map;

public interface DeliveryStore {
    int nextSequence();
    int track(String eventId, String subscriptionId);
    boolean ack(String eventId);
    Object nack(String eventId);
    Map<String, Object> deadLetter(String eventId, Map<String, Object> reason);
    List<Map<String, Object>> getPending();
    List<Map<String, Object>> getPendingForSubscription(String subscriptionId);
    boolean isAcknowledged(String eventId);
    boolean isPending(String eventId);
    boolean hasAttemptsRemaining(String eventId, int maxAttempts);
    Map<String, Object> getStats();
    List<Map<String, Object>> getDeadLettered();
}
```

- [ ] **Step 4: Implement in-memory getDeadLettered**

In `InMemoryDeliveryStore.java`, add after `getPendingForSubscription`:

```java
    public List<Map<String, Object>> getDeadLettered() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (var entry : deadLettered.values()) {
            var record = new LinkedHashMap<String, Object>();
            record.put("eventId", entry.get("eventId"));
            record.put("subscriptionId", entry.get("subscriptionId"));
            record.put("reason", entry.get("reason"));
            result.add(record);
        }
        return result;
    }
```

- [ ] **Step 5: Fix sqlite reason storage and implement getDeadLettered**

In `SqliteDeliveryStore.java`, the `deadLetter` method stores `reason.toString()`. Change it to store JSON. First ensure the class has an `ObjectMapper`; if not, add a field `private static final com.fasterxml.jackson.databind.ObjectMapper MAPPER = new com.fasterxml.jackson.databind.ObjectMapper();`.

Change the reason bind from:

```java
                stmt.setString(7, reason.toString());
```

to:

```java
                stmt.setString(7, MAPPER.writeValueAsString(reason));
```

Wrap the enclosing method so `JsonProcessingException` is handled: if the method does not already declare/catch it, catch and rethrow as `RuntimeException`. Read the method first and align the try/catch.

Add after `getPendingForSubscription`:

```java
    public List<Map<String, Object>> getDeadLettered() {
        var result = new ArrayList<Map<String, Object>>();
        try (var stmt = conn.prepareStatement(
                "SELECT event_id, subscription_id, reason FROM delivery_dead_lettered ORDER BY seq");
             var rs = stmt.executeQuery()) {
            while (rs.next()) {
                var record = new LinkedHashMap<String, Object>();
                record.put("eventId", rs.getString("event_id"));
                record.put("subscriptionId", rs.getString("subscription_id"));
                record.put("reason", MAPPER.readValue(rs.getString("reason"), Map.class));
                result.add(record);
            }
        } catch (Exception e) {
            throw new RuntimeException("getDeadLettered failed", e);
        }
        return result;
    }
```

- [ ] **Step 6: Implement postgres getDeadLettered**

In `PostgresDeliveryStore.java`, confirm it has an `ObjectMapper` field (it uses `?::jsonb` and stores JSON strings). Add after `getPendingForSubscription`:

```java
    public List<Map<String, Object>> getDeadLettered() {
        var result = new ArrayList<Map<String, Object>>();
        try (var stmt = conn.prepareStatement(
                "SELECT event_id, subscription_id, reason FROM " + t("dead_lettered") + " ORDER BY seq");
             var rs = stmt.executeQuery()) {
            while (rs.next()) {
                var record = new LinkedHashMap<String, Object>();
                record.put("eventId", rs.getString("event_id"));
                record.put("subscriptionId", rs.getString("subscription_id"));
                record.put("reason", MAPPER.readValue(rs.getString("reason"), Map.class));
                result.add(record);
            }
        } catch (Exception e) {
            throw new RuntimeException("getDeadLettered failed", e);
        }
        return result;
    }
```

Read `PostgresDeliveryStore.java` first to confirm the `MAPPER` field name and the `t(...)` table-prefix helper; use the actual names.

- [ ] **Step 7: Run store tests**

Run: `cd reference/java && mvn test -Dtest=InMemoryDeliveryStoreTest,SqliteDeliveryStoreTest,PostgresDeliveryStoreTest`
Expected: all pass.

- [ ] **Step 8: Commit and push**

```bash
git add reference/java/src/main/java/com/axisrobo/aep/DeliveryStore.java reference/java/src/main/java/com/axisrobo/aep/InMemoryDeliveryStore.java reference/java/src/main/java/com/axisrobo/aep/SqliteDeliveryStore.java reference/java/src/main/java/com/axisrobo/aep/PostgresDeliveryStore.java reference/java/src/test/java/com/axisrobo/aep/InMemoryDeliveryStoreTest.java
git commit -m "feat(java): make DeliveryStore public and add getDeadLettered"
git push origin master
```

---

## Task 3: Runtime config

**Files:**
- Create: `reference/java/src/main/java/com/axisrobo/aep/runtime/Config.java`
- Test: `reference/java/src/test/java/com/axisrobo/aep/runtime/ConfigTest.java`

- [ ] **Step 1: Write failing test**

Create `reference/java/src/test/java/com/axisrobo/aep/runtime/ConfigTest.java`:

```java
package com.axisrobo.aep.runtime;

import com.axisrobo.aep.DeliveryStore;
import com.axisrobo.aep.InMemoryDeliveryStore;
import org.junit.jupiter.api.Test;
import java.nio.file.*;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class ConfigTest {
    @Test
    void defaultConfigHasApiTransport() {
        var c = Config.defaultConfig();
        assertEquals("0.1", c.aepVersion());
        assertEquals(8790, c.api().port());
        assertEquals("sqlite", c.delivery().store());
    }

    @Test
    void applyEnvOverrides() {
        var c = Config.applyEnvOverrides(Config.defaultConfig(), Map.of(
            "AEPD_API_PORT", "9003",
            "AEP_POSTGRES_URL", "postgres://example/db"
        ));
        assertEquals(9003, c.api().port());
        assertEquals("postgres://example/db", c.delivery().postgresUrl());
    }

    @Test
    void writeAndLoad(@org.junit.jupiter.api.io.TempDir Path dir) throws Exception {
        var path = dir.resolve("aep.config.json");
        Config.writeDefaultConfig(path.toString());
        var loaded = Config.load(path.toString(), Map.of());
        assertEquals("runtime:aepd", loaded.runtimeSource());
    }

    @Test
    void createDeliveryStoreMemory() {
        DeliveryStore store = Config.createDeliveryStore(Config.defaultConfig().withStore("memory"));
        assertInstanceOf(InMemoryDeliveryStore.class, store);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd reference/java && mvn test -Dtest=ConfigTest`
Expected: compilation failure, `Config` not found.

- [ ] **Step 3: Implement Config**

Create `reference/java/src/main/java/com/axisrobo/aep/runtime/Config.java`:

```java
package com.axisrobo.aep.runtime;

import com.axisrobo.aep.DeliveryStore;
import com.axisrobo.aep.InMemoryDeliveryStore;
import com.axisrobo.aep.SqliteDeliveryStore;
import com.axisrobo.aep.PostgresDeliveryStore;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

public class Config {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public record Transport(boolean enabled, String host, int port, String path) {}

    private String aepVersion = "0.1";
    private String runtimeId = "aepd-local";
    private String runtimeSource = "runtime:aepd";
    private Transport websocket = new Transport(true, "127.0.0.1", 8787, "/aep");
    private Transport sse = new Transport(true, "127.0.0.1", 8788, "/aep/events");
    private Transport api = new Transport(true, "127.0.0.1", 8790, "/aep/api");
    private String deliveryStore = "sqlite";
    private String sqlitePath = ".aep/aep.sqlite";
    private String postgresUrl = "postgres://postgres:postgres@localhost:5433/postgres";

    public static Config defaultConfig() {
        return new Config();
    }

    public String aepVersion() { return aepVersion; }
    public String runtimeId() { return runtimeId; }
    public String runtimeSource() { return runtimeSource; }
    public Transport websocket() { return websocket; }
    public Transport sse() { return sse; }
    public Transport api() { return api; }

    public Delivery delivery() { return new Delivery(deliveryStore, sqlitePath, postgresUrl); }

    public record Delivery(String store, String sqlitePath, String postgresUrl) {}

    public Config withStore(String store) {
        this.deliveryStore = store;
        return this;
    }

    public Config withApi(Transport t) {
        this.api = t;
        return this;
    }

    public Config withWebsocketEnabled(boolean enabled) {
        this.websocket = new Transport(enabled, websocket.host(), websocket.port(), websocket.path());
        return this;
    }

    public Config withSseEnabled(boolean enabled) {
        this.sse = new Transport(enabled, sse.host(), sse.port(), sse.path());
        return this;
    }

    public static void writeDefaultConfig(String path) throws Exception {
        var p = Path.of(path);
        if (p.getParent() != null) Files.createDirectories(p.getParent());
        Files.writeString(p, MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(defaultConfig().toMap()) + "\n");
    }

    public Map<String, Object> toMap() {
        return Map.of(
            "aep_version", aepVersion,
            "runtime", Map.of("id", runtimeId, "source", runtimeSource),
            "transports", Map.of(
                "websocket", transportMap(websocket),
                "sse", transportMap(sse),
                "api", transportMap(api),
                "stdio", Map.of("enabled", false)
            ),
            "delivery", Map.of(
                "store", deliveryStore,
                "sqlite", Map.of("path", sqlitePath),
                "postgres", Map.of("url", postgresUrl)
            )
        );
    }

    private static Map<String, Object> transportMap(Transport t) {
        return Map.of("enabled", t.enabled(), "host", t.host(), "port", t.port(), "path", t.path());
    }

    @SuppressWarnings("unchecked")
    public static Config load(String path, Map<String, String> env) throws Exception {
        var raw = Files.readString(Path.of(path));
        var parsed = (Map<String, Object>) MAPPER.readValue(raw, Map.class);
        var c = new Config();
        c.aepVersion = (String) parsed.getOrDefault("aep_version", "0.1");
        var runtime = (Map<String, Object>) parsed.getOrDefault("runtime", Map.of());
        c.runtimeId = (String) runtime.getOrDefault("id", "aepd-local");
        c.runtimeSource = (String) runtime.getOrDefault("source", "runtime:aepd");
        var transports = (Map<String, Object>) parsed.getOrDefault("transports", Map.of());
        c.websocket = readTransport(transports, "websocket", c.websocket);
        c.sse = readTransport(transports, "sse", c.sse);
        c.api = readTransport(transports, "api", c.api);
        var delivery = (Map<String, Object>) parsed.getOrDefault("delivery", Map.of());
        c.deliveryStore = (String) delivery.getOrDefault("store", "sqlite");
        var sqlite = (Map<String, Object>) delivery.getOrDefault("sqlite", Map.of());
        c.sqlitePath = (String) sqlite.getOrDefault("path", ".aep/aep.sqlite");
        var postgres = (Map<String, Object>) delivery.getOrDefault("postgres", Map.of());
        c.postgresUrl = (String) postgres.getOrDefault("url", c.postgresUrl);
        return applyEnvOverrides(c, env);
    }

    @SuppressWarnings("unchecked")
    private static Transport readTransport(Map<String, Object> transports, String key, Transport fallback) {
        var t = (Map<String, Object>) transports.get(key);
        if (t == null) return fallback;
        return new Transport(
            (boolean) t.getOrDefault("enabled", fallback.enabled()),
            (String) t.getOrDefault("host", fallback.host()),
            ((Number) t.getOrDefault("port", fallback.port())).intValue(),
            (String) t.getOrDefault("path", fallback.path())
        );
    }

    public static Config applyEnvOverrides(Config c, Map<String, String> env) {
        String host = env.get("AEPD_HOST");
        if (host != null && !host.isEmpty()) {
            c.websocket = new Transport(c.websocket.enabled(), host, c.websocket.port(), c.websocket.path());
            c.sse = new Transport(c.sse.enabled(), host, c.sse.port(), c.sse.path());
            c.api = new Transport(c.api.enabled(), host, c.api.port(), c.api.path());
        }
        String wsPort = env.get("AEPD_WS_PORT");
        if (wsPort != null && !wsPort.isEmpty()) {
            c.websocket = new Transport(c.websocket.enabled(), c.websocket.host(), Integer.parseInt(wsPort), c.websocket.path());
        }
        String ssePort = env.get("AEPD_SSE_PORT");
        if (ssePort != null && !ssePort.isEmpty()) {
            c.sse = new Transport(c.sse.enabled(), c.sse.host(), Integer.parseInt(ssePort), c.sse.path());
        }
        String apiPort = env.get("AEPD_API_PORT");
        if (apiPort != null && !apiPort.isEmpty()) {
            c.api = new Transport(c.api.enabled(), c.api.host(), Integer.parseInt(apiPort), c.api.path());
        }
        String pg = env.get("AEP_POSTGRES_URL");
        if (pg != null && !pg.isEmpty()) {
            c.postgresUrl = pg;
        }
        return c;
    }

    public static DeliveryStore createDeliveryStore(Config c) {
        try {
            switch (c.deliveryStore) {
                case "memory":
                    return new InMemoryDeliveryStore();
                case "sqlite":
                    return new SqliteDeliveryStore(c.sqlitePath == null || c.sqlitePath.isEmpty() ? ":memory:" : c.sqlitePath);
                case "postgres":
                    return new PostgresDeliveryStore(
                        "jdbc:postgresql://localhost:5433/postgres?user=postgres&password=postgres",
                        "stream_01", "delivery", false);
                default:
                    throw new IllegalArgumentException("unsupported delivery store: " + c.deliveryStore);
            }
        } catch (Exception e) {
            throw new RuntimeException("createDeliveryStore failed", e);
        }
    }
}
```

Read `SqliteDeliveryStore` and `PostgresDeliveryStore` constructors first to confirm exact signatures used in `createDeliveryStore`. The `PostgresDeliveryStore` constructor from the delivery-store work is `(String url, String streamId, String tablePrefix, boolean dropOnClose)` and expects a JDBC URL; keep the JDBC form.

- [ ] **Step 4: Run config test**

Run: `cd reference/java && mvn test -Dtest=ConfigTest`
Expected: all pass.

- [ ] **Step 5: Commit and push**

```bash
git add reference/java/src/main/java/com/axisrobo/aep/runtime/Config.java reference/java/src/test/java/com/axisrobo/aep/runtime/ConfigTest.java
git commit -m "feat(java): add runtime Config"
git push origin master
```

---

## Task 4: Runtime service and HTTP api

**Files:**
- Create: `reference/java/src/main/java/com/axisrobo/aep/runtime/AepRuntimeService.java`
- Create: `reference/java/src/main/java/com/axisrobo/aep/runtime/ApiServer.java`
- Test: `reference/java/src/test/java/com/axisrobo/aep/runtime/RuntimeServiceTest.java`

- [ ] **Step 1: Write failing tests**

Create `reference/java/src/test/java/com/axisrobo/aep/runtime/RuntimeServiceTest.java`:

```java
package com.axisrobo.aep.runtime;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import java.net.URI;
import java.net.http.*;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.jupiter.api.Assertions.*;

class RuntimeServiceTest {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private Config apiConfig() {
        var c = Config.defaultConfig().withStore("memory").withWebsocketEnabled(false).withSseEnabled(false);
        return c.withApi(new Config.Transport(true, "127.0.0.1", 0, "/aep/api"));
    }

    private Map<String, Object> event(String id) {
        return Map.of("aep_version", "0.1", "id", id, "type", "task.submitted",
            "source", "t", "created_at", "2026-07-11T10:00:00Z", "payload", Map.of());
    }

    @Test
    void publishesToSubscribers() {
        var c = Config.defaultConfig().withStore("memory").withWebsocketEnabled(false).withSseEnabled(false)
            .withApi(new Config.Transport(false, "127.0.0.1", 0, "/aep/api"));
        var svc = new AepRuntimeService(c);
        var seen = new AtomicInteger();
        svc.subscribe("task.*", e -> seen.incrementAndGet());
        svc.start();
        svc.publish(event("evt_a"));
        assertEquals(1, seen.get());
        svc.stop();
    }

    @Test
    void rejectsInvalid() {
        var c = Config.defaultConfig().withStore("memory").withWebsocketEnabled(false).withSseEnabled(false)
            .withApi(new Config.Transport(false, "127.0.0.1", 0, "/aep/api"));
        var svc = new AepRuntimeService(c);
        svc.start();
        assertThrows(IllegalArgumentException.class, () -> svc.publish(Map.of("type", "task.submitted")));
        svc.stop();
    }

    @Test
    void apiEndpoints() throws Exception {
        var svc = new AepRuntimeService(apiConfig());
        svc.start();
        Thread.sleep(200);
        var base = "http://127.0.0.1:" + svc.apiPort() + "/aep/api";
        var client = HttpClient.newHttpClient();

        var health = client.send(HttpRequest.newBuilder(URI.create(base + "/healthz")).build(),
            HttpResponse.BodyHandlers.ofString());
        assertEquals(200, health.statusCode());
        assertTrue(health.body().contains("\"status\":\"ok\""));

        var post = client.send(HttpRequest.newBuilder(URI.create(base + "/events"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(MAPPER.writeValueAsString(event("evt_api")))).build(),
            HttpResponse.BodyHandlers.ofString());
        assertEquals(202, post.statusCode());

        var pending = client.send(HttpRequest.newBuilder(URI.create(base + "/pending")).build(),
            HttpResponse.BodyHandlers.ofString());
        assertTrue(pending.body().contains("\"pending\":1"));

        var bad = client.send(HttpRequest.newBuilder(URI.create(base + "/events"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString("{\"type\":\"task.submitted\"}")).build(),
            HttpResponse.BodyHandlers.ofString());
        assertEquals(400, bad.statusCode());

        var notFound = client.send(HttpRequest.newBuilder(URI.create(base + "/nope")).build(),
            HttpResponse.BodyHandlers.ofString());
        assertEquals(404, notFound.statusCode());

        svc.stop();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd reference/java && mvn test -Dtest=RuntimeServiceTest`
Expected: compilation failure, `AepRuntimeService` not found.

- [ ] **Step 3: Implement ApiServer**

Create `reference/java/src/main/java/com/axisrobo/aep/runtime/ApiServer.java`:

```java
package com.axisrobo.aep.runtime;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

public class ApiServer {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final AepRuntimeService service;
    private final String base;
    private HttpServer server;
    private int port;

    public ApiServer(AepRuntimeService service, Config.Transport t) {
        this.service = service;
        this.base = t.path() == null || t.path().isEmpty() ? "/aep/api" : t.path();
    }

    public int port() { return port; }

    public void start(String host, int requestedPort) throws IOException {
        server = HttpServer.create(new InetSocketAddress(host, requestedPort), 0);
        server.createContext(base, this::handle);
        server.setExecutor(null);
        server.start();
        port = server.getAddress().getPort();
    }

    public void stop() {
        if (server != null) {
            server.stop(0);
            server = null;
        }
    }

    private void handle(HttpExchange exchange) throws IOException {
        var path = exchange.getRequestURI().getPath();
        var route = path.startsWith(base) ? path.substring(base.length()) : path;
        var method = exchange.getRequestMethod();
        try {
            if (route.equals("/healthz") && method.equals("GET")) {
                send(exchange, 200, Map.of(
                    "status", "ok",
                    "runtime", Map.of("id", service.config().runtimeId(), "source", service.config().runtimeSource()),
                    "delivery", service.getStats()));
            } else if (route.equals("/events") && method.equals("POST")) {
                handleIngest(exchange);
            } else if (route.equals("/dlq") && method.equals("GET")) {
                List<Map<String, Object>> records = service.getDeadLettered();
                send(exchange, 200, Map.of("deadLettered", records.size(), "records", records));
            } else if (route.equals("/pending") && method.equals("GET")) {
                List<Map<String, Object>> records = service.getPending();
                send(exchange, 200, Map.of("pending", records.size(), "records", records));
            } else if (route.equals("/stats") && method.equals("GET")) {
                send(exchange, 200, service.getStats());
            } else {
                send(exchange, 404, Map.of("error", "not found"));
            }
        } catch (Exception e) {
            send(exchange, 500, Map.of("error", e.getMessage()));
        }
    }

    @SuppressWarnings("unchecked")
    private void handleIngest(HttpExchange exchange) throws IOException {
        var raw = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        Map<String, Object> event;
        try {
            event = (Map<String, Object>) MAPPER.readValue(raw, Map.class);
        } catch (Exception e) {
            send(exchange, 400, Map.of("accepted", false, "errors", List.of("invalid JSON body")));
            return;
        }
        var errors = com.axisrobo.aep.Envelope.validate(event);
        if (!errors.isEmpty()) {
            send(exchange, 400, Map.of("accepted", false, "errors", errors));
            return;
        }
        service.publish(event);
        send(exchange, 202, Map.of("accepted", true, "id", event.get("id")));
    }

    private void send(HttpExchange exchange, int status, Map<String, Object> body) throws IOException {
        var payload = MAPPER.writeValueAsBytes(body);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, payload.length);
        try (var os = exchange.getResponseBody()) {
            os.write(payload);
        }
    }
}
```

- [ ] **Step 4: Implement AepRuntimeService**

Create `reference/java/src/main/java/com/axisrobo/aep/runtime/AepRuntimeService.java`:

```java
package com.axisrobo.aep.runtime;

import com.axisrobo.aep.DeliveryStore;
import com.axisrobo.aep.Envelope;
import com.axisrobo.aep.Subscriptions;
import com.axisrobo.aep.transport.WsServer;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

public class AepRuntimeService {
    private record Sub(String pattern, Consumer<Map<String, Object>> handler) {}

    private final Config config;
    private final DeliveryStore store;
    private final List<Sub> subs = new ArrayList<>();
    private WsServer ws;
    private ApiServer api;
    private boolean started;

    public AepRuntimeService(Config config) {
        this.config = config;
        this.store = Config.createDeliveryStore(config);
    }

    public Config config() { return config; }

    public void subscribe(String pattern, Consumer<Map<String, Object>> handler) {
        subs.add(new Sub(pattern, handler));
    }

    public Map<String, Object> publish(Map<String, Object> event) {
        var errors = Envelope.validate(event);
        if (!errors.isEmpty()) {
            throw new IllegalArgumentException("invalid AEP event: " + String.join("; ", errors));
        }
        var id = (String) event.get("id");
        var sub = (String) event.getOrDefault("subscription_id", "_runtime");
        store.track(id, sub == null ? "_runtime" : sub);
        var type = (String) event.get("type");
        for (var s : subs) {
            if (Subscriptions.matchesType(s.pattern(), type)) {
                s.handler().accept(event);
            }
        }
        if (ws != null) {
            try { ws.broadcast(event); } catch (IOException ignored) {}
        }
        return event;
    }

    public void start() {
        if (started) return;
        if (config.websocket().enabled()) {
            ws = new WsServer(config.websocket().port());
            ws.onMessage(this::publish);
            ws.start();
        }
        if (config.api().enabled()) {
            api = new ApiServer(this, config.api());
            try {
                api.start(config.api().host(), config.api().port());
            } catch (IOException e) {
                throw new RuntimeException("api start failed", e);
            }
        }
        started = true;
    }

    public void stop() {
        if (ws != null) {
            try { ws.stop(); } catch (Exception ignored) {}
            ws = null;
        }
        if (api != null) {
            api.stop();
            api = null;
        }
        started = false;
    }

    public int apiPort() { return api != null ? api.port() : -1; }

    public Map<String, Object> getStats() { return store.getStats(); }
    public List<Map<String, Object>> getPending() { return store.getPending(); }
    public List<Map<String, Object>> getDeadLettered() { return store.getDeadLettered(); }
}
```

Confirm `WsServer.stop()` exists; `org.java_websocket.server.WebSocketServer` has `stop()`. If it throws checked exceptions, the try/catch already guards it.

- [ ] **Step 5: Run runtime service test**

Run: `cd reference/java && mvn test -Dtest=RuntimeServiceTest`
Expected: all pass.

- [ ] **Step 6: Commit and push**

```bash
git add reference/java/src/main/java/com/axisrobo/aep/runtime/AepRuntimeService.java reference/java/src/main/java/com/axisrobo/aep/runtime/ApiServer.java reference/java/src/test/java/com/axisrobo/aep/runtime/RuntimeServiceTest.java
git commit -m "feat(java): add runtime service and HTTP api server"
git push origin master
```

---

## Task 5: Daemon and picocli CLI

**Files:**
- Modify: `reference/java/pom.xml` (add picocli)
- Create: `reference/java/src/main/java/com/axisrobo/aep/runtime/Aepd.java`
- Create: `reference/java/src/main/java/com/axisrobo/aep/cli/AepCli.java`
- Test: `reference/java/src/test/java/com/axisrobo/aep/cli/AepCliTest.java`

- [ ] **Step 1: Add picocli dependency**

In `reference/java/pom.xml`, add after the `junit-jupiter` dependency:

```xml
        <dependency>
            <groupId>info.picocli</groupId>
            <artifactId>picocli</artifactId>
            <version>4.7.6</version>
        </dependency>
```

- [ ] **Step 2: Write failing CLI test**

Create `reference/java/src/test/java/com/axisrobo/aep/cli/AepCliTest.java`:

```java
package com.axisrobo.aep.cli;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.*;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class AepCliTest {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Test
    void initWritesConfig(@TempDir Path dir) throws Exception {
        var path = dir.resolve("aep.config.json");
        int code = AepCli.run(new String[]{"init", "--config", path.toString()});
        assertEquals(0, code);
        var parsed = MAPPER.readValue(Files.readString(path), Map.class);
        var runtime = (Map<?, ?>) parsed.get("runtime");
        assertEquals("aepd-local", runtime.get("id"));
    }
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd reference/java && mvn test -Dtest=AepCliTest`
Expected: compilation failure, `AepCli` not found.

- [ ] **Step 4: Implement the daemon main**

Create `reference/java/src/main/java/com/axisrobo/aep/runtime/Aepd.java`:

```java
package com.axisrobo.aep.runtime;

public class Aepd {
    public static void main(String[] args) throws Exception {
        var configPath = System.getenv("AEP_CONFIG");
        Config config = configPath != null && !configPath.isEmpty()
            ? Config.load(configPath, System.getenv())
            : Config.defaultConfig();
        var svc = new AepRuntimeService(config);
        svc.start();
        System.out.println("aepd started api=" + svc.apiPort());
        Runtime.getRuntime().addShutdownHook(new Thread(svc::stop));
        Thread.currentThread().join();
    }
}
```

- [ ] **Step 5: Implement the picocli CLI**

Create `reference/java/src/main/java/com/axisrobo/aep/cli/AepCli.java`:

```java
package com.axisrobo.aep.cli;

import com.axisrobo.aep.DeliveryStore;
import com.axisrobo.aep.Subscriptions;
import com.axisrobo.aep.runtime.AepRuntimeService;
import com.axisrobo.aep.runtime.Config;
import com.axisrobo.aep.transport.WsClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import picocli.CommandLine;
import picocli.CommandLine.Command;
import picocli.CommandLine.Option;
import picocli.CommandLine.Parameters;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Command(name = "aep", description = "Agent Event Protocol CLI",
    subcommands = {AepCli.Init.class, AepCli.Start.class, AepCli.Status.class,
                   AepCli.Emit.class, AepCli.Subscribe.class, AepCli.Dlq.class})
public class AepCli implements Runnable {
    static final ObjectMapper MAPPER = new ObjectMapper();

    public void run() {
        new CommandLine(this).usage(System.out);
    }

    public static int run(String[] args) {
        return new CommandLine(new AepCli()).execute(args);
    }

    public static void main(String[] args) {
        System.exit(run(args));
    }

    @Command(name = "init", description = "Create an AEP runtime config file")
    static class Init implements java.util.concurrent.Callable<Integer> {
        @Option(names = "--config", defaultValue = "aep.config.json") String config;
        public Integer call() throws Exception {
            Config.writeDefaultConfig(config);
            System.out.println("created " + config);
            return 0;
        }
    }

    @Command(name = "start", description = "Start the local aepd runtime daemon")
    static class Start implements java.util.concurrent.Callable<Integer> {
        @Option(names = "--config", defaultValue = "aep.config.json") String config;
        public Integer call() throws Exception {
            var c = Config.load(config, System.getenv());
            var svc = new AepRuntimeService(c);
            svc.start();
            System.out.println("aepd started api=" + svc.apiPort());
            Thread.currentThread().join();
            return 0;
        }
    }

    @Command(name = "status", description = "Query an aepd health endpoint")
    static class Status implements java.util.concurrent.Callable<Integer> {
        @Option(names = "--url", defaultValue = "http://127.0.0.1:8790/aep/api/healthz") String url;
        public Integer call() throws Exception {
            var client = HttpClient.newHttpClient();
            var resp = client.send(HttpRequest.newBuilder(URI.create(url)).build(),
                HttpResponse.BodyHandlers.ofString());
            System.out.println(resp.body());
            return 0;
        }
    }

    @Command(name = "emit", description = "Emit one AEP event over WebSocket")
    static class Emit implements java.util.concurrent.Callable<Integer> {
        @Parameters(index = "0") String type;
        @Option(names = "--payload", defaultValue = "{}") String payload;
        @Option(names = "--url", defaultValue = "ws://127.0.0.1:8787/aep") String url;
        @Option(names = "--id") String id;
        @Option(names = "--source", defaultValue = "cli:aep") String source;
        @SuppressWarnings("unchecked")
        public Integer call() throws Exception {
            Map<String, Object> parsed;
            try {
                parsed = (Map<String, Object>) MAPPER.readValue(payload, Map.class);
            } catch (Exception e) {
                System.err.println("invalid JSON payload");
                return 1;
            }
            var event = Map.of(
                "aep_version", "0.1",
                "id", id != null ? id : "evt_" + UUID.randomUUID().toString().replace("-", ""),
                "type", type, "source", source,
                "created_at", Instant.now().toString(), "payload", parsed);
            var client = new WsClient(URI.create(url));
            client.connect();
            client.send(event);
            client.close();
            System.out.println(MAPPER.writeValueAsString(event));
            return 0;
        }
    }

    @Command(name = "subscribe", description = "Subscribe to AEP events over WebSocket")
    static class Subscribe implements java.util.concurrent.Callable<Integer> {
        @Option(names = "--type", defaultValue = "*") String type;
        @Option(names = "--url", defaultValue = "ws://127.0.0.1:8787/aep") String url;
        public Integer call() throws Exception {
            var client = new WsClient(URI.create(url));
            client.onMessage(event -> {
                var t = (String) event.get("type");
                if (Subscriptions.matchesType(type, t)) {
                    try {
                        System.out.println(MAPPER.writeValueAsString(event));
                    } catch (Exception ignored) {}
                }
            });
            client.connect();
            Thread.currentThread().join();
            return 0;
        }
    }

    @Command(name = "dlq", description = "Inspect dead-lettered events")
    static class Dlq implements java.util.concurrent.Callable<Integer> {
        @Parameters(index = "0", defaultValue = "list") String subcommand;
        @Option(names = "--config", defaultValue = "aep.config.json") String config;
        public Integer call() throws Exception {
            if (!subcommand.equals("list")) {
                System.err.println("unsupported dlq command: " + subcommand);
                return 1;
            }
            var c = Config.load(config, System.getenv());
            DeliveryStore store = Config.createDeliveryStore(c);
            List<Map<String, Object>> records = store.getDeadLettered();
            var stats = store.getStats();
            System.out.println(MAPPER.writeValueAsString(Map.of(
                "deadLettered", stats.getOrDefault("deadLettered", records.size()),
                "records", records)));
            return 0;
        }
    }
}
```

The `WsClient` constructor takes a `java.net.URI` (`new WsClient(URI.create(url))`), exposes `connect()`, `send(Map)`, `onMessage(Consumer)`, and `close()`. The CLI imports `java.net.URI`.

- [ ] **Step 6: Run CLI test and build**

Run: `cd reference/java && mvn test -Dtest=AepCliTest`
Expected: PASS.

Run: `cd reference/java && mvn -q compile`
Expected: compiles.

- [ ] **Step 7: Commit and push**

```bash
git add reference/java/pom.xml reference/java/src/main/java/com/axisrobo/aep/runtime/Aepd.java reference/java/src/main/java/com/axisrobo/aep/cli/AepCli.java reference/java/src/test/java/com/axisrobo/aep/cli/AepCliTest.java
git commit -m "feat(java): add aepd daemon and aep picocli CLI"
git push origin master
```

---

## Task 6: Final verification

- [ ] **Step 1: Run full Java suite**

Run: `cd reference/java && mvn test`
Expected: BUILD SUCCESS, all tests pass.

- [ ] **Step 2: Verify git sync**

Run: `git status -sb`
Expected: `## master...origin/master` with no changed files.
