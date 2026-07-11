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
