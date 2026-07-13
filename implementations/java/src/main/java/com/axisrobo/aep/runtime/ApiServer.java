package com.axisrobo.aep.runtime;

import com.axisrobo.aep.Envelope;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;

public class ApiServer {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final HarmovelaRuntimeService service;
    private final String base;
    private HttpServer server;
    private int port;

    public ApiServer(HarmovelaRuntimeService service, Config.Transport t) {
        this.service = service;
        this.base = t.path() == null || t.path().isEmpty() ? "/harmovela/api" : t.path();
    }

    public int port() { return port; }

    public void start(String host, int requestedPort) throws IOException {
        server = HttpServer.create(new InetSocketAddress(host, requestedPort), 0);
        server.createContext(base, this::handle);
        server.setExecutor(Executors.newCachedThreadPool());
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
            } else if (route.equals("/subscriptions") && method.equals("POST")) {
                handleCreateSubscription(exchange);
            } else if (route.equals("/subscriptions") && method.equals("GET")) {
                send(exchange, 200, Map.of("subscriptions", service.listSubscriptions()));
            } else if (route.startsWith("/subscriptions/")) {
                handleSubscriptionItem(route, method, exchange);
            } else {
                send(exchange, 404, Map.of("error", "not found"));
            }
        } catch (Exception e) {
            send(exchange, 500, Map.of("error", String.valueOf(e.getMessage())));
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
        var errors = Envelope.validate(event);
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
}
