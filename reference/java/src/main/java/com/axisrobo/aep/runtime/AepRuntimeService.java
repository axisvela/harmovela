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
