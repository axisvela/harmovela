package com.axisrobo.aep.transport;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;

public class SseServer {

    private final HttpServer server;
    private final ObjectMapper mapper;

    public SseServer(int port) throws IOException {
        this.server = HttpServer.create(new InetSocketAddress(port), 0);
        this.mapper = new ObjectMapper();
        server.createContext("/harmovela/events", this::handleEvents);
        server.setExecutor(null);
    }

    public void start() {
        server.start();
    }

    public void stop() {
        server.stop(0);
    }

    public int getPort() {
        return server.getAddress().getPort();
    }

    private void handleEvents(HttpExchange exchange) throws IOException {
        try {
            var method = exchange.getRequestMethod();
            switch (method) {
                case "GET" -> handleStream(exchange);
                case "POST" -> handleIngest(exchange);
                default -> {
                    exchange.sendResponseHeaders(405, -1);
                }
            }
        } catch (Exception e) {
            var msg = "{\"error\":\"internal_error\"}";
            var bytes = msg.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(500, bytes.length);
            exchange.getResponseBody().write(bytes);
        } finally {
            exchange.close();
        }
    }

    private void handleStream(HttpExchange exchange) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", "text/event-stream");
        exchange.getResponseHeaders().set("Cache-Control", "no-cache");
        exchange.getResponseHeaders().set("Connection", "keep-alive");
        exchange.sendResponseHeaders(200, 0);
        var body = exchange.getResponseBody();
        body.write(": heartbeat\n\n".getBytes(StandardCharsets.UTF_8));
        body.flush();
    }

    private void handleIngest(HttpExchange exchange) throws IOException {
        var body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        var lines = body.lines().filter(l -> !l.isBlank()).toList();

        int accepted = 0;
        int rejected = 0;
        var errors = new ArrayList<Object>();

        for (int i = 0; i < lines.size(); i++) {
            var line = lines.get(i);
            try {
                mapper.readTree(line);
                accepted++;
            } catch (IOException e) {
                rejected++;
                errors.add(java.util.Map.of(
                    "event_index", i,
                    "error", java.util.Map.of(
                        "code", "invalid_json",
                        "message", "invalid JSON at line " + (i + 1)
                    )
                ));
            }
        }

        if (accepted == 0 && rejected > 0) {
            var resp = mapper.writeValueAsString(java.util.Map.of(
                "accepted", accepted,
                "rejected", rejected,
                "errors", errors
            ));
            var bytes = resp.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(400, bytes.length);
            exchange.getResponseBody().write(bytes);
            return;
        }

        var resp = mapper.writeValueAsString(java.util.Map.of(
            "accepted", accepted,
            "rejected", rejected,
            "errors", errors
        ));
        var bytes = resp.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(202, bytes.length);
        exchange.getResponseBody().write(bytes);
    }
}
