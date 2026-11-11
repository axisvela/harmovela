package com.axisvela.harmovela.client;

import com.axisvela.harmovela.runtime.Config;
import com.axisvela.harmovela.runtime.HarmovelaRuntimeService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

class HarmovelaClientTest {
    private HarmovelaRuntimeService service;
    private HarmovelaClient client;

    @BeforeEach
    void setUp() {
        var config = Config.defaultConfig()
                .withStore("memory")
                .withWebsocketEnabled(false)
                .withSseEnabled(false)
                .withApi(new Config.Transport(true, "127.0.0.1", 0, "/harmovela/api"));
        service = new HarmovelaRuntimeService(config);
        service.start();
        client = new HarmovelaClient(
                "http://127.0.0.1:" + service.apiPort(), "/harmovela/api");
    }

    @AfterEach
    void tearDown() {
        service.stop();
    }

    private static Map<String, Object> event(String id, String type) {
        return Map.of(
                "spec_version", "0.2",
                "id", id,
                "type", type,
                "source", "client-test",
                "created_at", Instant.now().toString(),
                "payload", Map.of());
    }

    @Test
    void healthPublishAndInspectDelivery() {
        assertEquals("ok", client.health().get("status"));
        var accepted = client.publish(event("evt_health", "task.submitted"));
        assertEquals(true, accepted.get("accepted"));
        assertEquals("evt_health", accepted.get("id"));
        assertEquals(1, ((Number) client.stats().get("pending")).intValue());
        assertEquals(1, ((Number) client.pending().get("pending")).intValue());
        assertEquals(0, ((Number) client.deadLettered().get("deadLettered")).intValue());
    }

    @Test
    void invalidEventIsRejectedLocally() {
        var error = assertThrows(HarmovelaClientException.class,
                () -> client.publish(Map.of("type", "task.submitted")));
        assertEquals(0, error.status());
        assertTrue(error.getMessage().contains("invalid Harmovela event"));
    }

    @Test
    void subscriptionLifecycleAndPoll() {
        var created = client.createSubscription(Map.of("types", "task.*"));
        var id = (String) created.get("id");
        assertTrue(id.startsWith("sub_"));
        assertEquals(1, client.listSubscriptions().size());
        assertEquals(id, client.getSubscription(id).get("id"));

        client.publish(event("evt_match", "task.completed"));
        client.publish(event("evt_skip", "session.opened"));
        var events = client.poll(id);
        assertEquals(1, events.size());
        assertEquals("evt_match", events.get(0).get("id"));

        assertEquals(true, client.deleteSubscription(id).get("deleted"));
        var missing = assertThrows(HarmovelaClientException.class,
                () -> client.getSubscription(id));
        assertEquals(404, missing.status());
    }

    @Test
    void streamDeliversLiveEvent() throws Exception {
        var created = client.createSubscription(Map.of("types", "task.*"));
        var id = (String) created.get("id");
        var received = new AtomicReference<Map<String, Object>>();
        var latch = new CountDownLatch(1);
        Thread worker = new Thread(() -> {
            try {
                client.stream(id, value -> {
                    received.set(value);
                    latch.countDown();
                });
            } catch (HarmovelaClientException ignored) {
            }
        });
        worker.start();
        Thread.sleep(100);
        client.publish(event("evt_stream", "task.completed"));
        assertTrue(latch.await(3, TimeUnit.SECONDS));
        assertEquals("evt_stream", received.get().get("id"));
        worker.interrupt();
        worker.join(Duration.ofSeconds(2).toMillis());
    }
}
