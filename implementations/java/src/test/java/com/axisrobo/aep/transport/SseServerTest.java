package com.axisrobo.aep.transport;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class SseServerTest {

    private SseServer server;
    private HttpClient client;
    private ObjectMapper mapper;
    private int port;

    @BeforeEach
    void setUp() throws Exception {
        mapper = new ObjectMapper();
        server = new SseServer(0);
        server.start();
        port = server.getPort();
        client = HttpClient.newHttpClient();
    }

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop();
        }
    }

    @Test
    void servesTextEventStream() throws Exception {
        var request = HttpRequest.newBuilder()
            .uri(URI.create("http://localhost:" + port + "/harmovela/events"))
            .header("Accept", "text/event-stream")
            .GET()
            .build();

        var response = client.send(request, HttpResponse.BodyHandlers.ofString());

        assertEquals(200, response.statusCode());
        assertTrue(response.headers().firstValue("Content-Type")
            .orElse("").contains("text/event-stream"),
            "Content-Type should be text/event-stream");
    }

    @Test
    void postIngestAcceptsValidEvent() throws Exception {
        var event = Map.<String, Object>of(
            "spec_version", "0.2",
            "id", "evt_001",
            "type", "task.submitted",
            "source", "agent:test",
            "created_at", "2026-07-09T10:00:00Z",
            "payload", Map.of()
        );
        var body = mapper.writeValueAsString(event);

        var request = HttpRequest.newBuilder()
            .uri(URI.create("http://localhost:" + port + "/harmovela/events"))
            .header("Content-Type", "application/x-ndjson")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();

        var response = client.send(request, HttpResponse.BodyHandlers.ofString());

        assertEquals(202, response.statusCode(), "expected 202 Accepted");
    }

    @Test
    void postIngestRejectsInvalidJson() throws Exception {
        var body = "this is not json";

        var request = HttpRequest.newBuilder()
            .uri(URI.create("http://localhost:" + port + "/harmovela/events"))
            .header("Content-Type", "application/x-ndjson")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();

        var response = client.send(request, HttpResponse.BodyHandlers.ofString());

        assertEquals(400, response.statusCode(), "expected 400 for invalid JSON");
    }
}
