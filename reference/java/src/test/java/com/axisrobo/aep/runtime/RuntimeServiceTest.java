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
