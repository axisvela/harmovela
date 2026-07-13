package com.axisrobo.aep.runtime;

import com.axisrobo.aep.DeliveryStore;
import com.axisrobo.aep.Envelope;
import com.axisrobo.harmovela.event.transport.WsServer;
import com.axisrobo.harmovela.event.subscription.Subscriptions;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;

public class HarmovelaRuntimeService {
    private record Sub(String pattern, Consumer<Map<String, Object>> handler) {}

    private static class RegistryEntry {
        final Map<String, Object> record;
        final List<Map<String, Object>> buffer = new ArrayList<>();
        final java.util.Set<Consumer<Map<String, Object>>> sinks = ConcurrentHashMap.newKeySet();
        RegistryEntry(Map<String, Object> record) { this.record = record; }
    }

    private final Config config;
    private final DeliveryStore store;
    private final List<Sub> subs = new ArrayList<>();
    private final Map<String, RegistryEntry> subscriptions = new ConcurrentHashMap<>();
    private final int maxBuffer = 1000;
    private WsServer ws;
    private ApiServer api;
    private boolean started;

    public HarmovelaRuntimeService(Config config) {
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
            throw new IllegalArgumentException("invalid Harmovela event: " + String.join("; ", errors));
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
        for (var record : store.listSubscriptions()) {
            subscriptions.put((String) record.get("id"), new RegistryEntry(record));
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
}
