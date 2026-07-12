package com.axisrobo.aep.runtime;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import java.net.URI;
import java.net.http.*;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class ApiSubscriptionsTest {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private HarmovelaRuntimeService startService() {
        var c = Config.defaultConfig().withStore("memory").withWebsocketEnabled(false).withSseEnabled(false)
            .withApi(new Config.Transport(true, "127.0.0.1", 0, "/harmovela/api"));
        var svc = new HarmovelaRuntimeService(c);
        svc.start();
        return svc;
    }

    @Test
    void crudAndLongPoll() throws Exception {
        var svc = startService();
        Thread.sleep(200);
        var base = "http://127.0.0.1:" + svc.apiPort() + "/harmovela/api";
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

        svc.publish(Map.of("spec_version", "0.2", "id", "evt_lp", "type", "task.submitted",
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
        var base = "http://127.0.0.1:" + svc.apiPort() + "/harmovela/api";
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
        svc.publish(Map.of("spec_version", "0.2", "id", "evt_sse", "type", "task.submitted",
            "source", "t", "created_at", "2026-07-11T10:00:00Z", "payload", Map.of()));

        var line = received.get(3, java.util.concurrent.TimeUnit.SECONDS);
        assertTrue(line.contains("evt_sse"));
        svc.stop();
    }
}
